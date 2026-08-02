import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'login_history', timestamps: { createdAt: 'at', updatedAt: false } })
export class LoginHistory {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  principalId!: Types.ObjectId;

  @Prop({ required: true, enum: ['USER', 'EMPLOYEE'] })
  actor!: string;

  @Prop({ required: true })
  success!: boolean;

  @Prop()
  failureReason?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  deviceId?: string;

  at!: Date;
}

export type LoginHistoryDocument = HydratedDocument<LoginHistory>;
export const LoginHistorySchema = SchemaFactory.createForClass(LoginHistory);
LoginHistorySchema.index({ principalId: 1, at: -1 });
