import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActorType, AuditLog } from './audit-log.schema';

export interface AuditEntry {
  actorType: ActorType;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

/**
 * Write-once audit trail. Exposes ONLY record() and read queries — by
 * construction there is no way to mutate or delete an audit row (US-ADM-5).
 * record() never throws: an audit failure must not abort the business
 * operation, but it is logged loudly for alerting.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectModel(AuditLog.name) private readonly model: Model<AuditLog>) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.model.create(entry);
    } catch (err) {
      this.logger.error(`AUDIT WRITE FAILED for ${entry.action} on ${entry.entity}/${entry.entityId}: ${(err as Error).message}`);
    }
  }

  async forEntity(entity: string, entityId: string, limit = 100): Promise<AuditLog[]> {
    return this.model.find({ entity, entityId }).sort({ at: -1 }).limit(limit).lean();
  }

  async forActor(actorId: string, limit = 100): Promise<AuditLog[]> {
    return this.model.find({ actorId }).sort({ at: -1 }).limit(limit).lean();
  }
}
