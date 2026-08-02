import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from '../../domain/order.types';

@Schema({ _id: false })
class TriggerSub {
  @Prop({ required: true, enum: ['STOP_LOSS', 'TARGET'] }) kind!: string;
  @Prop({ required: true }) pricePaise!: number;
  @Prop({ default: false }) armed!: boolean;
}
const TriggerSubSchema = SchemaFactory.createForClass(TriggerSub);

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  challengeId!: Types.ObjectId;

  @Prop({ required: true })
  instrumentKey!: string;

  @Prop({ required: true, enum: ['BUY', 'SELL'] })
  side!: string;

  @Prop({ required: true, enum: ['MARKET', 'LIMIT'] })
  type!: string;

  @Prop({ required: true, enum: ['INTRADAY', 'CARRY_FORWARD'] })
  product!: string;

  @Prop({ required: true })
  qty!: number;

  @Prop()
  limitPricePaise?: number;

  @Prop({ type: TriggerSubSchema })
  trigger?: TriggerSub;

  @Prop({ required: true, enum: Object.values(OrderStatus), index: true })
  status!: OrderStatus;

  @Prop()
  filledPricePaise?: number;

  @Prop()
  chargesPaise?: number;

  @Prop()
  rejectionReason?: string;

  /** Parent order id for auto-generated SL/Target exit orders. */
  @Prop({ type: Types.ObjectId })
  parentOrderId?: Types.ObjectId;

  @Prop()
  placedAt!: Date;

  @Prop()
  executedAt?: Date;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);
// Open-order matching lookup (partial: only OPEN orders).
OrderSchema.index({ status: 1, instrumentKey: 1 }, { partialFilterExpression: { status: 'OPEN' } });
OrderSchema.index({ userId: 1, status: 1, placedAt: -1 });
OrderSchema.index({ challengeId: 1, placedAt: -1 });
