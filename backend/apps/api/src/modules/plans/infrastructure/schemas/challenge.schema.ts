import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ChallengeStatus } from '../../domain/plan.types';

@Schema({ _id: false })
class RulesSnapshot {
  @Prop({ required: true }) profitTargetPct!: number;
  @Prop({ required: true }) maxDrawdownPct!: number;
  @Prop({ required: true }) dailyDrawdownPct!: number;
  @Prop({ required: true }) drawdownAnchor!: string;
  @Prop({ required: true }) minTradingDays!: number;
  @Prop({ required: true }) expiryDays!: number;
  @Prop({ required: true }) rewardPct!: number;
  @Prop({ type: [String], required: true }) segments!: string[];
}
const RulesSnapshotSchema = SchemaFactory.createForClass(RulesSnapshot);

/**
 * Challenge instance. P3 creates it in PENDING with capital credited and the
 * plan rules snapshotted. The P5 trading engine and P6 evaluator populate the
 * live equity/tracking fields — declared here so no migration is needed later.
 */
@Schema({ collection: 'challenges', timestamps: true })
export class Challenge {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  planId!: Types.ObjectId;

  @Prop({ required: true })
  planVersion!: number;

  @Prop({ required: true })
  planName!: string;

  @Prop({ type: RulesSnapshotSchema, required: true })
  rules!: RulesSnapshot;

  @Prop({ required: true })
  virtualCapitalPaise!: number;

  // --- live tracking (owned by P5/P6; initialized here) ---
  @Prop({ required: true })
  equityPaise!: number;

  @Prop({ required: true })
  peakEquityPaise!: number;

  @Prop({ required: true })
  dayStartEquityPaise!: number;

  @Prop({ required: true, default: 0 })
  realizedPnlPaise!: number;

  @Prop({ type: [String], default: [] })
  tradingDays!: string[]; // distinct IST date keys with at least one fill

  @Prop({ required: true, enum: Object.values(ChallengeStatus), default: ChallengeStatus.PENDING, index: true })
  status!: ChallengeStatus;

  @Prop({ required: true })
  startedAt!: Date;

  @Prop({ required: true })
  endsAt!: Date;

  @Prop({ type: [Object], default: [] })
  events!: Array<{ at: Date; type: string; note?: string }>;
}

export type ChallengeDocument = HydratedDocument<Challenge>;
export const ChallengeSchema = SchemaFactory.createForClass(Challenge);
ChallengeSchema.index({ userId: 1, status: 1 });
ChallengeSchema.index({ status: 1, endsAt: 1 });
