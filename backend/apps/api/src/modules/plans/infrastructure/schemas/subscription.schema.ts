import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SubscriptionStatus } from '../../domain/plan.types';

@Schema({ collection: 'subscriptions', timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  planId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  challengeId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  paymentId!: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(SubscriptionStatus), default: SubscriptionStatus.ACTIVE, index: true })
  status!: SubscriptionStatus;

  @Prop({ required: true })
  activatedAt!: Date;

  @Prop({ required: true })
  expiresAt!: Date;
}

export type SubscriptionDocument = HydratedDocument<Subscription>;
export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ expiresAt: 1 });
