import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../infrastructure/role.schema';
import { DEFAULT_ROLES } from '../domain/permissions';

/**
 * In-memory role→permissions map, refreshed on every mutation and every 60s
 * (cheap; roles change rarely, guards check on every request). Seeds the six
 * default roles on first boot (insert-only).
 */
@Injectable()
export class RoleCacheService implements OnModuleInit {
  private readonly logger = new Logger(RoleCacheService.name);
  private map: Map<string, readonly string[]> = new Map();

  constructor(@InjectModel(Role.name) private readonly roles: Model<Role>) {}

  async onModuleInit(): Promise<void> {
    for (const [key, def] of Object.entries(DEFAULT_ROLES)) {
      await this.roles.updateOne(
        { key },
        { $setOnInsert: { key, name: def.name, permissions: def.permissions, locked: key === 'SUPER_ADMIN' } },
        { upsert: true },
      );
    }
    await this.refresh();
    const timer = setInterval(() => void this.refresh().catch((e) => this.logger.error(e.message)), 60_000);
    timer.unref();
  }

  async refresh(): Promise<void> {
    const rows = await this.roles.find().lean();
    this.map = new Map(rows.map((r) => [r.key, r.permissions] as const));
  }

  get rolePermissions(): ReadonlyMap<string, readonly string[]> {
    return this.map;
  }
}
