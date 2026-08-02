import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActorType = 'USER' | 'EMPLOYEE' | 'SYSTEM';

/** Immutable audit record (NFR-7). No update/delete path exists in code. */
@Schema({ collection: 'audit_logs', timestamps: { createdAt: 'at', updatedAt: false } })
export class AuditLog {
  @Prop({ required: true, enum: ['USER', 'EMPLOYEE', 'SYSTEM'] })
  actorType!: ActorType;

  @Prop({ required: true, index: true })
  actorId!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  entity!: string;

  @Prop({ required: true })
  entityId!: string;

  @Prop({ type: Object })
  before?: unknown;

  @Prop({ type: Object })
  after?: unknown;

  @Prop()
  ip?: string;

  at!: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ entity: 1, entityId: 1, at: -1 });
AuditLogSchema.index({ actorId: 1, at: -1 });
AuditLogSchema.index({ at: -1 });
