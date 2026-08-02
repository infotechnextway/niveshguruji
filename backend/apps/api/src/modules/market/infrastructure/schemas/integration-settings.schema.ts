import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Singleton-ish integration settings for Upstox (one doc, provider=upstox).
 * Secrets are AES-GCM encrypted with DATA_ENC_SECRET. Env vars remain a
 * fallback when no DB row is set.
 */
@Schema({ collection: 'integrations', timestamps: true })
export class IntegrationSettings extends Document {
  @Prop({ required: true, unique: true, index: true })
  provider!: string;

  /** simulator | upstox | angel | dhan — which live adapter the engine should run. */
  @Prop({ required: true, enum: ['simulator', 'upstox', 'angel', 'dhan'], default: 'simulator' })
  feedMode!: 'simulator' | 'upstox' | 'angel' | 'dhan';

  @Prop()
  accessTokenEnc?: string;

  @Prop()
  apiKeyEnc?: string;

  @Prop()
  apiSecretEnc?: string;

  /** Angel One client code (not secret, but stored with integration). */
  @Prop()
  clientCode?: string;

  /** Angel One feed token (encrypted). */
  @Prop()
  feedTokenEnc?: string;

  @Prop()
  updatedBy?: string;
}

export const IntegrationSettingsSchema = SchemaFactory.createForClass(IntegrationSettings);
