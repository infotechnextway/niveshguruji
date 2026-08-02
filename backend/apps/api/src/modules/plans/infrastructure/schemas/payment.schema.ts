import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentStatus } from '../../domain/plan.types';

@Schema({ collection: 'payments', timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  planId!: Types.ObjectId;

  @Prop({ required: true })
  amountPaise!: number;

  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({ required: true, enum: Object.values(PaymentStatus), default: PaymentStatus.CREATED, index: true })
  status!: PaymentStatus;

  @Prop({ required: true })
  provider!: string;

  /** Gateway's order id (Razorpay order_xxx). Unique — one intent per order. */
  @Prop({ required: true, unique: true })
  gatewayOrderId!: string;

  @Prop()
  gatewayPaymentId?: string;

  @Prop()
  gatewayRefundId?: string;

  /**
   * Idempotency key for activation. Unique index guarantees exactly-once
   * capital crediting even under concurrent webhook + poller.
   */
  @Prop({ required: true, unique: true })
  idempotencyKey!: string;

  @Prop({ type: Types.ObjectId })
  subscriptionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  challengeId?: Types.ObjectId;

  @Prop()
  failureReason?: string;

  @Prop()
  refundReason?: string;

  @Prop({ type: Object })
  lastWebhookMeta?: Record<string, unknown>;
}

export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: 1 });
