import { Injectable } from '@nestjs/common';
import { AppConfigService, AuditService, CONFIG_REGISTRY, ConfigKey, DomainError, Result } from '@app/shared';

/** Exposes the P0 business-config registry to Operations (NFR-8 in practice). */
@Injectable()
export class ConfigAdminService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  listAll() {
    return Object.entries(CONFIG_REGISTRY).map(([key, def]) => ({
      key,
      description: def.description,
      default: def.default,
      value: this.appConfig.get(key as ConfigKey),
    }));
  }

  async set(key: string, value: unknown, actorId: string, ip?: string): Promise<Result<true>> {
    if (!(key in CONFIG_REGISTRY)) {
      return Result.fail(DomainError.of('UNKNOWN_CONFIG_KEY', `Unknown config key: ${key}`));
    }
    const before = this.appConfig.get(key as ConfigKey);
    try {
      await this.appConfig.set(key as ConfigKey, value as never, actorId);
    } catch (err) {
      return Result.fail(DomainError.of('CONFIG_INVALID', (err as Error).message));
    }
    await this.audit.record({
      actorType: 'EMPLOYEE', actorId, action: 'CONFIG_UPDATED', entity: 'app_config', entityId: key,
      before: { value: before }, after: { value }, ip,
    });
    return Result.ok(true);
  }
}
