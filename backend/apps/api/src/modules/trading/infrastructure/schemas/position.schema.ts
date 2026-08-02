import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'positions', timestamps: true })
export class Position {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  challengeId!: Types.ObjectId;

  @Prop({ required: true })
  instrumentKey!: string;

  @Prop({ required: true, enum: ['INTRADAY', 'CARRY_FORWARD'] })
  product!: string;

  @Prop({ required: true, default: 0 })
  netQty!: number;

  @Prop({ required: true, default: 0 })
  avgPricePaise!: number;

  @Prop({ required: true, default: 0 })
  realizedPnlPaise!: number;

  @Prop({ required: true, default: 0 })
  dayBuyQty!: number;

  @Prop({ required: true, default: 0 })
  daySellQty!: number;
}

export type PositionDocument = HydratedDocument<Position>;
export const PositionSchema = SchemaFactory.createForClass(Position);
PositionSchema.index({ challengeId: 1, instrumentKey: 1, product: 1 }, { unique: true });
