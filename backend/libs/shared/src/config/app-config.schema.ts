import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** Business configuration — DB-backed so nothing is hardcoded (NFR-8). */
@Schema({ collection: 'app_config', timestamps: true })
export class AppConfigEntry {
  @Prop({ required: true, unique: true, index: true })
  key!: string;

  @Prop({ type: Object, required: true })
  value!: unknown;

  @Prop({ required: true })
  updatedBy!: string;
}

export type AppConfigEntryDocument = HydratedDocument<AppConfigEntry>;
export const AppConfigEntrySchema = SchemaFactory.createForClass(AppConfigEntry);
