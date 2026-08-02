import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'candles_1m', timestamps: false })
export class Candle1m {
  @Prop({ required: true, index: true })
  instrumentKey!: string;

  @Prop({ required: true })
  ts!: number; // minute-aligned epoch ms

  @Prop({ required: true }) o!: number;
  @Prop({ required: true }) h!: number;
  @Prop({ required: true }) l!: number;
  @Prop({ required: true }) c!: number;
  @Prop({ required: true, default: 0 }) v!: number;
}

export type Candle1mDocument = HydratedDocument<Candle1m>;
export const Candle1mSchema = SchemaFactory.createForClass(Candle1m);
Candle1mSchema.index({ instrumentKey: 1, ts: 1 }, { unique: true });
