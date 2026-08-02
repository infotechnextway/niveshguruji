import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * One row per issued refresh token. Rotation writes a new row in the same
 * familyId and revokes the old one; presenting a revoked token again is
 * token-theft evidence and revokes the whole family (US-AUTH-4).
 */
@Schema({ collection: 'sessions', timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  principalId!: Types.ObjectId;

  @Prop({ required: true, enum: ['USER', 'EMPLOYEE'] })
  actor!: string;

  /** sha256(refreshToken) — the raw token never touches the database. */
  @Prop({ required: true, unique: true })
  refreshHash!: string;

  @Prop({ required: true, index: true })
  familyId!: string;

  @Prop()
  deviceId?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  revokedAt?: Date;

  @Prop()
  replacedByHash?: string;
}

export type SessionDocument = HydratedDocument<Session>;
export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ principalId: 1, createdAt: -1 });
