import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from '@app/shared';
import { decryptField, encryptField } from '../../auth/infrastructure/crypto.util';
import { IntegrationSettings } from '../infrastructure/schemas/integration-settings.schema';

export interface UpstoxPublicStatus {
  provider: 'upstox';
  accessTokenSet: boolean;
  accessTokenPreview: string | null;
  apiKeySet: boolean;
  apiKeyPreview: string | null;
  apiSecretSet: boolean;
  source: 'database' | 'environment' | 'mixed' | 'none';
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface UpstoxUpdateInput {
  accessToken?: string;
  apiKey?: string;
  apiSecret?: string;
  clearAccessToken?: boolean;
  clearApiKey?: boolean;
  clearApiSecret?: boolean;
}
const PROVIDER = 'upstox';
const INVALIDATE_CHANNEL = 'integrations:upstox';

function maskSecret(value: string | undefined | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

/**
 * Runtime Upstox credentials: DB (encrypted) wins over env fallback.
 * Broadcasts Redis invalidation so api + engine reload without restart.
 */
@Injectable()
export class UpstoxCredentialsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UpstoxCredentialsService.name);
  private readonly encSecret: string;
  private accessToken: string | undefined;
  private apiKey: string | undefined;
  private apiSecret: string | undefined;
  private source: UpstoxPublicStatus['source'] = 'none';
  private updatedAt: Date | null = null;
  private updatedBy: string | null = null;
  private readonly listeners = new Set<() => void>();
  private envToken?: string;
  private envApiKey?: string;
  private envApiSecret?: string;

  constructor(
    @InjectModel(IntegrationSettings.name) private readonly model: Model<IntegrationSettings>,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly subscriber: Redis,
  ) {
    this.encSecret = config.getOrThrow<string>('DATA_ENC_SECRET');
    this.envToken = config.get<string>('UPSTOX_ACCESS_TOKEN') || undefined;
    this.envApiKey = config.get<string>('UPSTOX_API_KEY') || undefined;
    this.envApiSecret = config.get<string>('UPSTOX_API_SECRET') || undefined;
  }

  async onModuleInit(): Promise<void> {
    await this.reload();
    this.emitChange();
    await this.subscriber.subscribe(INVALIDATE_CHANNEL);
    this.subscriber.on('message', (channel) => {
      if (channel !== INVALIDATE_CHANNEL) return;
      this.reload()
        .then(() => this.emitChange())
        .catch((err) => this.logger.error(`Failed to reload Upstox credentials: ${(err as Error).message}`));
    });
  }

  onModuleDestroy(): void {
    this.listeners.clear();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  hasAccessToken(): boolean {
    return Boolean(this.accessToken);
  }

  getPublicStatus(): UpstoxPublicStatus {
    return {
      provider: 'upstox',
      accessTokenSet: Boolean(this.accessToken),
      accessTokenPreview: maskSecret(this.accessToken),
      apiKeySet: Boolean(this.apiKey),
      apiKeyPreview: maskSecret(this.apiKey),
      apiSecretSet: Boolean(this.apiSecret),
      source: this.source,
      updatedAt: this.updatedAt?.toISOString() ?? null,
      updatedBy: this.updatedBy,
    };
  }

  async update(input: UpstoxUpdateInput, updatedBy: string): Promise<UpstoxPublicStatus> {
    const existing = await this.model.findOne({ provider: PROVIDER }).lean();

    let accessTokenEnc: string | undefined = existing?.accessTokenEnc;
    let apiKeyEnc: string | undefined = existing?.apiKeyEnc;
    let apiSecretEnc: string | undefined = existing?.apiSecretEnc;

    if (input.clearAccessToken) accessTokenEnc = undefined;
    else if (input.accessToken?.trim()) accessTokenEnc = encryptField(input.accessToken.trim(), this.encSecret);

    if (input.clearApiKey) apiKeyEnc = undefined;
    else if (input.apiKey?.trim()) apiKeyEnc = encryptField(input.apiKey.trim(), this.encSecret);

    if (input.clearApiSecret) apiSecretEnc = undefined;
    else if (input.apiSecret?.trim()) apiSecretEnc = encryptField(input.apiSecret.trim(), this.encSecret);

    await this.model.findOneAndReplace(
      { provider: PROVIDER },
      {
        provider: PROVIDER,
        feedMode: 'simulator',
        updatedBy,
        ...(accessTokenEnc ? { accessTokenEnc } : {}),
        ...(apiKeyEnc ? { apiKeyEnc } : {}),
        ...(apiSecretEnc ? { apiSecretEnc } : {}),
      },
      { upsert: true },
    );

    await this.redis.publish(INVALIDATE_CHANNEL, 'reload');
    await this.reload();
    this.emitChange();
    return this.getPublicStatus();
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    const token = this.accessToken;
    if (!token) return { ok: false, message: 'No access token configured' };
    try {
      const res = await fetch('https://api.upstox.com/v3/feed/market-data-feed/authorize', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, message: `Upstox authorize failed (${res.status}): ${body.slice(0, 160)}` };
      }
      return { ok: true, message: 'Authorize succeeded — token is valid for market feed' };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }

  private emitChange(): void {
    for (const l of this.listeners) {
      try { l(); } catch (err) {
        this.logger.warn(`Upstox change listener failed: ${(err as Error).message}`);
      }
    }
  }

  private async reload(): Promise<void> {
    const row = await this.model.findOne({ provider: PROVIDER }).lean<{
      accessTokenEnc?: string;
      apiKeyEnc?: string;
      apiSecretEnc?: string;
      updatedBy?: string;
      updatedAt?: Date;
    } | null>();

    let dbToken: string | undefined;
    let dbKey: string | undefined;
    let dbSecret: string | undefined;

    if (row) {
      this.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
      this.updatedBy = row.updatedBy ?? null;
      try {
        if (row.accessTokenEnc) dbToken = decryptField(row.accessTokenEnc, this.encSecret);
        if (row.apiKeyEnc) dbKey = decryptField(row.apiKeyEnc, this.encSecret);
        if (row.apiSecretEnc) dbSecret = decryptField(row.apiSecretEnc, this.encSecret);
      } catch (err) {
        this.logger.error(`Failed to decrypt Upstox secrets: ${(err as Error).message}`);
      }
    } else {
      this.updatedAt = null;
      this.updatedBy = null;
    }

    this.accessToken = dbToken ?? this.envToken;
    this.apiKey = dbKey ?? this.envApiKey;
    this.apiSecret = dbSecret ?? this.envApiSecret;

    const hasDb = Boolean(row);
    const hasDbSecrets = Boolean(dbToken || dbKey || dbSecret);
    const hasEnvSecrets = Boolean(this.envToken || this.envApiKey || this.envApiSecret);
    if (!hasDb && !hasEnvSecrets) this.source = 'none';
    else if (!hasDb) this.source = 'environment';
    else if (hasDbSecrets && hasEnvSecrets && !dbToken && this.envToken) this.source = 'mixed';
    else if (hasDbSecrets) this.source = hasEnvSecrets && dbToken !== this.envToken ? 'mixed' : 'database';
    else this.source = hasEnvSecrets ? 'mixed' : 'database';

    this.logger.log(`Upstox credentials loaded (token=${Boolean(this.accessToken)}, source=${this.source})`);
  }
}
