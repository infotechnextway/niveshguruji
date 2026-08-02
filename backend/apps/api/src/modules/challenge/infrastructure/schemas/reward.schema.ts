import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum RewardStatus {
  ELIGIBLE = 'ELIGIBLE', // challenge passed, awaiting admin review
  APPROVED = 'APPROVED', // admin approved payout eligibility
  REJECTED = 'REJECTED', // admin rejected
  PAID = 'PAID', // marked paid (payout is off-platform)
}

@Schema({ _id: false })
class RewardTimelineEntry {
  @Prop({ required: true }) at!: Date;
  @Prop({ required: true }) event!: string;
  @Prop() byEmployeeId?: string;
  @Prop() note?: string;
}
const RewardTimelineEntrySchema = SchemaFactory.createForClass(RewardTimelineEntry);

@Schema({ collection: 'rewards', timestamps: true })
export class Reward {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  challengeId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  rewardPct!: number;

  /** System-computed reward at pass time (paise). */
  @Prop({ required: true })
  computedAmountPaise!: number;

  /** Admin override amount (paise), if any — supersedes computed for payout. */
  @Prop()
  overrideAmountPaise?: number;

  @Prop({ required: true, enum: Object.values(RewardStatus), default: RewardStatus.ELIGIBLE, index: true })
  status!: RewardStatus;

  @Prop({ type: Types.ObjectId })
  reviewerId?: Types.ObjectId;

  @Prop()
  decisionReason?: string;

  @Prop({ type: [RewardTimelineEntrySchema], default: [] })
  timeline!: RewardTimelineEntry[];
}

export type RewardDocument = HydratedDocument<Reward>;
export const RewardSchema = SchemaFactory.createForClass(Reward);
RewardSchema.index({ status: 1, createdAt: 1 });
