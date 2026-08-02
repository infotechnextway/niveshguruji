import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** Carry-forward equity carried overnight (US-PF-2). */
@Schema({ collection: 'holdings', timestamps: true })
export class Holding {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  challengeId!: Types.ObjectId;

  @Prop({ required: true })
  instrumentKey!: string;

  @Prop({ required: true, default: 0 })
  qty!: number;

  @Prop({ required: true, default: 0 })
  avgPricePaise!: number;
}

export type HoldingDocument = HydratedDocument<Holding>;
export const HoldingSchema = SchemaFactory.createForClass(Holding);
HoldingSchema.index({ challengeId: 1, instrumentKey: 1 }, { unique: true });
