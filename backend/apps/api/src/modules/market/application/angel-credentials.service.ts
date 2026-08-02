import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from '@app/shared';
import { decryptField, encryptField } from '../../auth/infrastructure/crypto.util';
import { IntegrationSettings } from '../infrastructure/schemas/integration-settings.schema';

export interface AngelPublicStatus {
  provider: 'angel';
  apiKeySet: boolean;
  apiKeyPreview: string | null;
  clientCode: string | null;
  jwtTokenSet: boolean;
  jwtTokenPreview: string | null;
  feedTokenSet: boolean;
  feedTokenPreview: string | null;
  source: 'database' | 'environment' | 'mixed' | 'none';
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface AngelUpdateInput {
  apiKey?: string;
  clientCode?: string;
  jwtToken?: string;
  feedToken?: string;
  clearApiKey?: boolean;
  clearJwtToken?: boolean;
  clearFeedToken?: boolean;
  clearClientCode?: boolean;
}

export interface AngelLoginInput {
  password: string;
  totp: string;
}
const PROVIDER = 'angel';
const INVALIDATE_CHANNEL = 'integrations:angel';
const LOGIN_URL = 'https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword';

function maskSecret(value: string | undefined | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

/**
 * Runtime Angel One credentials: DB (encrypted) wins over env fallback.
 * Broadcasts Redis invalidation so api + engine reload without restart.
 */
@Injectable()
export class AngelCredentialsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AngelCredentialsService.name);
  private readonly encSecret: string;
  private apiKey: string | undefined;
  private clientCode: string | undefined;
  private jwtToken: string | undefined;
  private feedToken: string | undefined;
  private source: AngelPublicStatus['source'] = 'none';
  private updatedAt: Date | null = null;
  private updatedBy: string | null = null;
  private readonly listeners = new Set<() => void>();
  private envApiKey?: string;
  private envClientCode?: string;
  private envJwtToken?: string;
  private envFeedToken?: string;

  constructor(
    @InjectModel(IntegrationSettings.name) private readonly model: Model<IntegrationSettings>,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly subscriber: Redis,
  ) {
    this.encSecret = config.getOrThrow<string>('DATA_ENC_SECRET');
    this.envApiKey = config.get<string>('ANGEL_API_KEY') || undefined;
    this.envClientCode = config.get<string>('ANGEL_CLIENT_CODE') || undefined;
    this.envJwtToken = config.get<string>('ANGEL_JWT_TOKEN') || undefined;
    this.envFeedToken = config.get<string>('ANGEL_FEED_TOKEN') || undefined;
  }

  async onModuleInit(): Promise<void> {
    await this.reload();
    await this.subscriber.subscribe(INVALIDATE_CHANNEL);
    this.subscriber.on('message', (channel) => {
      if (channel !== INVALIDATE_CHANNEL) return;
      this.reload()
        .then(() => this.emitChange())
        .catch((err) => this.logger.error(`Failed to reload Angel credentials: ${(err as Error).message}`));
    });
  }

  onModuleDestroy(): void {
    this.listeners.clear();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.clientCode && this.jwtToken && this.feedToken);
  }

  getApiKey(): string | undefined {
    return this.apiKey;
  }

  getClientCode(): string | undefined {
    return this.clientCode;
  }

  getJwtToken(): string | undefined {
    return this.jwtToken;
  }

  getFeedToken(): string | undefined {
    return this.feedToken;
  }

  getPublicStatus(): AngelPublicStatus {
    return {
      provider: 'angel',
      apiKeySet: Boolean(this.apiKey),
      apiKeyPreview: maskSecret(this.apiKey),
      clientCode: this.clientCode ?? null,
      jwtTokenSet: Boolean(this.jwtToken),
      jwtTokenPreview: maskSecret(this.jwtToken),
      feedTokenSet: Boolean(this.feedToken),
      feedTokenPreview: maskSecret(this.feedToken),
      source: this.source,
      updatedAt: this.updatedAt?.toISOString() ?? null,
      updatedBy: this.updatedBy,
    };
  }

  async update(input: AngelUpdateInput, updatedBy: string): Promise<AngelPublicStatus> {
    const existing = await this.model.findOne({ provider: PROVIDER }).lean();

    let apiKeyEnc: string | undefined = existing?.apiKeyEnc;
    let accessTokenEnc: string | undefined = existing?.accessTokenEnc;
    let feedTokenEnc: string | undefined = existing?.feedTokenEnc;
    let clientCode: string | undefined = existing?.clientCode;

    if (input.clearApiKey) apiKeyEnc = undefined;
    else if (input.apiKey?.trim()) apiKeyEnc = encryptField(input.apiKey.trim(), this.encSecret);

    if (input.clearJwtToken) accessTokenEnc = undefined;
    else if (input.jwtToken?.trim()) accessTokenEnc = encryptField(input.jwtToken.trim(), this.encSecret);

    if (input.clearFeedToken) feedTokenEnc = undefined;
    else if (input.feedToken?.trim()) feedTokenEnc = encryptField(input.feedToken.trim(), this.encSecret);

    if (input.clearClientCode) clientCode = undefined;
    else if (input.clientCode?.trim()) clientCode = input.clientCode.trim();

    await this.model.findOneAndReplace(
      { provider: PROVIDER },
      {
        provider: PROVIDER,
        feedMode: 'simulator',
        updatedBy,
        ...(apiKeyEnc ? { apiKeyEnc } : {}),
        ...(accessTokenEnc ? { accessTokenEnc } : {}),
        ...(feedTokenEnc ? { feedTokenEnc } : {}),
        ...(clientCode ? { clientCode } : {}),
      },
      { upsert: true },
    );

    await this.redis.publish(INVALIDATE_CHANNEL, 'reload');
    await this.reload();
    this.emitChange();
    return this.getPublicStatus();
  }

  async loginByPassword(input: AngelLoginInput, updatedBy: string): Promise<AngelPublicStatus> {
    const apiKey = this.apiKey;
    const clientCode = this.clientCode;
    if (!apiKey || !clientCode) {
      throw new Error('API key and client code must be configured before login');
    }

    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': apiKey,
      },
      body: JSON.stringify({
        clientcode: clientCode,
        password: input.password,
        totp: input.totp,
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      message?: string;
      data?: { jwtToken?: string; feedToken?: string };
    };

    if (!res.ok || !body.status || !body.data?.jwtToken || !body.data?.feedToken) {
      throw new Error(body.message || `Angel login failed (${res.status})`);
    }

    return this.update(
      { jwtToken: body.data.jwtToken, feedToken: body.data.feedToken },
      updatedBy,
    );
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { ok: false, message: 'API key, client code, JWT, and feed token are all required' };
    }
    try {
      const res = await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getProfile', {
        headers: {
          Authorization: `Bearer ${this.jwtToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': this.apiKey!,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, message: `Angel profile check failed (${res.status}): ${text.slice(0, 160)}` };
      }
      return { ok: true, message: 'Profile fetch succeeded — JWT token is valid' };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }

  private emitChange(): void {
    for (const l of this.listeners) {
      try { l(); } catch (err) {
        this.logger.warn(`Angel change listener failed: ${(err as Error).message}`);
      }
    }
  }

  private async reload(): Promise<void> {
    const row = await this.model.findOne({ provider: PROVIDER }).lean<{
      apiKeyEnc?: string;
      accessTokenEnc?: string;
      feedTokenEnc?: string;
      clientCode?: string;
      updatedBy?: string;
      updatedAt?: Date;
    } | null>();

    let dbKey: string | undefined;
    let dbJwt: string | undefined;
    let dbFeed: string | undefined;

    if (row) {
      this.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
      this.updatedBy = row.updatedBy ?? null;
      try {
        if (row.apiKeyEnc) dbKey = decryptField(row.apiKeyEnc, this.encSecret);
        if (row.accessTokenEnc) dbJwt = decryptField(row.accessTokenEnc, this.encSecret);
        if (row.feedTokenEnc) dbFeed = decryptField(row.feedTokenEnc, this.encSecret);
      } catch (err) {
        this.logger.error(`Failed to decrypt Angel secrets: ${(err as Error).message}`);
      }
    } else {
      this.updatedAt = null;
      this.updatedBy = null;
    }

    this.apiKey = dbKey ?? this.envApiKey;
    this.clientCode = row?.clientCode ?? this.envClientCode;
    this.jwtToken = dbJwt ?? this.envJwtToken;
    this.feedToken = dbFeed ?? this.envFeedToken;

    const hasDb = Boolean(row);
    const hasDbSecrets = Boolean(dbKey || dbJwt || dbFeed);
    const hasEnvSecrets = Boolean(this.envApiKey || this.envJwtToken || this.envFeedToken);
    if (!hasDb && !hasEnvSecrets) this.source = 'none';
    else if (!hasDb) this.source = 'environment';
    else if (hasDbSecrets && hasEnvSecrets) this.source = 'mixed';
    else if (hasDbSecrets) this.source = 'database';
    else this.source = hasEnvSecrets ? 'mixed' : 'database';

    this.logger.log(
      `Angel credentials loaded (configured=${this.isConfigured()}, source=${this.source})`,
    );
  }
}
