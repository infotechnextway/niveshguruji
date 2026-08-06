import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from '@app/shared';
import { decryptField, encryptField } from '../../auth/infrastructure/crypto.util';
import { IntegrationSettings } from '../infrastructure/schemas/integration-settings.schema';

export interface DhanPublicStatus {
  provider: 'dhan';
  clientId: string | null;
  accessTokenSet: boolean;
  accessTokenPreview: string | null;
  source: 'database' | 'environment' | 'mixed' | 'none';
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface DhanUpdateInput {
  clientId?: string;
  accessToken?: string;
  clearClientId?: boolean;
  clearAccessToken?: boolean;
}

export interface DhanGenerateTokenInput {
  dhanClientId: string;
  pin: string;
  totp: string;
}

export interface DhanGenerateTokenResult {
  ok: boolean;
  message: string;
  accessToken?: string;
  expiryTime?: string;
  dhanClientName?: string;
}

const PROVIDER = 'dhan';
const INVALIDATE_CHANNEL = 'integrations:dhan';
const PROFILE_URL = 'https://api.dhan.co/v2/profile';
const GENERATE_TOKEN_URL = 'https://auth.dhan.co/app/generateAccessToken';

function maskSecret(value: string | undefined | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

/**
 * Runtime Dhan credentials: DB (encrypted) wins over env fallback.
 * Broadcasts Redis invalidation so api + engine reload without restart.
 */
@Injectable()
export class DhanCredentialsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DhanCredentialsService.name);
  private readonly encSecret: string;
  private clientId: string | undefined;
  private accessToken: string | undefined;
  private source: DhanPublicStatus['source'] = 'none';
  private updatedAt: Date | null = null;
  private updatedBy: string | null = null;
  private readonly listeners = new Set<() => void>();
  private envClientId?: string;
  private envAccessToken?: string;

  constructor(
    @InjectModel(IntegrationSettings.name) private readonly model: Model<IntegrationSettings>,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly subscriber: Redis,
  ) {
    this.encSecret = config.getOrThrow<string>('DATA_ENC_SECRET');
    this.envClientId = config.get<string>('DHAN_CLIENT_ID') || undefined;
    this.envAccessToken = config.get<string>('DHAN_ACCESS_TOKEN') || undefined;
  }

  async onModuleInit(): Promise<void> {
    await this.reload();
    // Notify feeds that started before credentials finished loading.
    this.emitChange();
    await this.subscriber.subscribe(INVALIDATE_CHANNEL);
    this.subscriber.on('message', (channel) => {
      if (channel !== INVALIDATE_CHANNEL) return;
      this.reload()
        .then(() => this.emitChange())
        .catch((err) => this.logger.error(`Failed to reload Dhan credentials: ${(err as Error).message}`));
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
    return Boolean(this.clientId && this.accessToken);
  }

  getClientId(): string | undefined {
    return this.clientId;
  }

  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  getPublicStatus(): DhanPublicStatus {
    return {
      provider: 'dhan',
      clientId: this.clientId ?? null,
      accessTokenSet: Boolean(this.accessToken),
      accessTokenPreview: maskSecret(this.accessToken),
      source: this.source,
      updatedAt: this.updatedAt?.toISOString() ?? null,
      updatedBy: this.updatedBy,
    };
  }

  async update(input: DhanUpdateInput, updatedBy: string): Promise<DhanPublicStatus> {
    const existing = await this.model.findOne({ provider: PROVIDER }).lean();

    let accessTokenEnc: string | undefined = existing?.accessTokenEnc;
    let clientCode: string | undefined = existing?.clientCode;

    if (input.clearAccessToken) accessTokenEnc = undefined;
    else if (input.accessToken?.trim()) accessTokenEnc = encryptField(input.accessToken.trim(), this.encSecret);

    if (input.clearClientId) clientCode = undefined;
    else if (input.clientId?.trim()) clientCode = input.clientId.trim();

    await this.model.findOneAndReplace(
      { provider: PROVIDER },
      {
        provider: PROVIDER,
        feedMode: 'simulator',
        updatedBy,
        ...(accessTokenEnc ? { accessTokenEnc } : {}),
        ...(clientCode ? { clientCode } : {}),
      },
      { upsert: true },
    );

    await this.redis.publish(INVALIDATE_CHANNEL, 'reload');
    await this.reload();
    this.emitChange();
    return this.getPublicStatus();
  }

  async generateAccessToken(
    input: DhanGenerateTokenInput,
    updatedBy: string,
  ): Promise<DhanGenerateTokenResult> {
    const dhanClientId = input.dhanClientId.trim();
    const pin = input.pin.trim();
    const totp = input.totp.trim();

    if (!dhanClientId || !pin || !totp) {
      return { ok: false, message: 'Client ID, PIN, and TOTP are all required' };
    }

    const url = new URL(GENERATE_TOKEN_URL);
    url.searchParams.set('dhanClientId', dhanClientId);
    url.searchParams.set('pin', pin);
    url.searchParams.set('totp', totp);

    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });

      const body = (await res.json().catch(() => ({}))) as {
        accessToken?: string;
        expiryTime?: string;
        dhanClientName?: string;
        dhanClientId?: string;
        message?: string;
        error?: string;
        status?: string;
      };

      if (!res.ok || !body.accessToken) {
        const msg =
          body.message ||
          body.error ||
          body.status ||
          `Dhan token generation failed (${res.status})`;
        return { ok: false, message: msg };
      }

      await this.update(
        { clientId: body.dhanClientId ?? dhanClientId, accessToken: body.accessToken },
        updatedBy,
      );

      return {
        ok: true,
        message: 'Access token generated and saved',
        accessToken: body.accessToken,
        expiryTime: body.expiryTime,
        dhanClientName: body.dhanClientName,
      };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { ok: false, message: 'Client ID and access token are both required' };
    }
    try {
      const res = await fetch(PROFILE_URL, {
        headers: {
          'access-token': this.accessToken!,
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, message: `Dhan profile check failed (${res.status}): ${text.slice(0, 160)}` };
      }
      return { ok: true, message: 'Profile fetch succeeded — access token is valid' };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }

  private emitChange(): void {
    for (const l of this.listeners) {
      try { l(); } catch (err) {
        this.logger.warn(`Dhan change listener failed: ${(err as Error).message}`);
      }
    }
  }

  private async reload(): Promise<void> {
    const row = await this.model.findOne({ provider: PROVIDER }).lean<{
      accessTokenEnc?: string;
      clientCode?: string;
      updatedBy?: string;
      updatedAt?: Date;
    } | null>();

    let dbToken: string | undefined;

    if (row) {
      this.updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
      this.updatedBy = row.updatedBy ?? null;
      try {
        if (row.accessTokenEnc) dbToken = decryptField(row.accessTokenEnc, this.encSecret);
      } catch (err) {
        this.logger.error(`Failed to decrypt Dhan secrets: ${(err as Error).message}`);
      }
    } else {
      this.updatedAt = null;
      this.updatedBy = null;
    }

    this.clientId = row?.clientCode ?? this.envClientId;
    this.accessToken = dbToken ?? this.envAccessToken;

    const hasDb = Boolean(row);
    const hasDbSecrets = Boolean(dbToken);
    const hasEnvSecrets = Boolean(this.envClientId || this.envAccessToken);
    if (!hasDb && !hasEnvSecrets) this.source = 'none';
    else if (!hasDb) this.source = 'environment';
    else if (hasDbSecrets && hasEnvSecrets) this.source = 'mixed';
    else if (hasDbSecrets) this.source = 'database';
    else this.source = hasEnvSecrets ? 'mixed' : 'database';

    this.logger.log(
      `Dhan credentials loaded (configured=${this.isConfigured()}, source=${this.source})`,
    );
  }
}
