import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'trades', timestamps: { createdAt: 'at', updatedAt: false } })
export class Trade {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  orderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  challengeId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  instrumentKey!: string;

  @Prop({ required: true, enum: ['BUY', 'SELL'] })
  side!: string;

  @Prop({ required: true })
  qty!: number;

  @Prop({ required: true })
  pricePaise!: number;

  @Prop({ required: true, default: 0 })
  chargesPaise!: number;

  @Prop({ required: true, default: 0 })
  realizedPnlPaise!: number;

  at!: Date;
}

export type TradeDocument = HydratedDocument<Trade>;
export const TradeSchema = SchemaFactory.createForClass(Trade);
TradeSchema.index({ challengeId: 1, at: -1 });
TradeSchema.index({ userId: 1, at: -1 });
