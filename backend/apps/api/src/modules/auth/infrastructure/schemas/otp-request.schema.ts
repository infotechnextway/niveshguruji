import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'otp_requests', timestamps: true })
export class OtpRequest {
  /** Mobile in E.164. */
  @Prop({ required: true, index: true })
  target!: string;

  @Prop({ required: true, enum: ['SMS'] })
  channel!: string;

  @Prop({ required: true, enum: ['MOBILE_VERIFY', 'MOBILE_CHANGE'] })
  purpose!: string;

  /** sha256(code + pepper). */
  @Prop({ required: true })
  codeHash!: string;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  consumedAt?: Date;
}

export type OtpRequestDocument = HydratedDocument<OtpRequest>;
export const OtpRequestSchema = SchemaFactory.createForClass(OtpRequest);
OtpRequestSchema.index({ target: 1, createdAt: -1 });
OtpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
