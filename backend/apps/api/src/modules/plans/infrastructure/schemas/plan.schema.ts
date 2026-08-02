import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PlanStatus } from '../../domain/plan.types';

@Schema({ _id: false })
class RulesSubdoc {
  @Prop({ required: true }) profitTargetPct!: number;
  @Prop({ required: true }) maxDrawdownPct!: number;
  @Prop({ required: true }) dailyDrawdownPct!: number;
  @Prop({ required: true, enum: ['PREV_DAY_CLOSE', 'INITIAL_CAPITAL'] }) drawdownAnchor!: string;
  @Prop({ required: true }) minTradingDays!: number;
  @Prop({ required: true }) expiryDays!: number;
  @Prop({ required: true }) rewardPct!: number;
  @Prop({ type: [String], required: true }) segments!: string[];
}
const RulesSubdocSchema = SchemaFactory.createForClass(RulesSubdoc);

@Schema({ collection: 'plans', timestamps: true })
export class Plan {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ trim: true, maxlength: 1000 })
  description?: string;

  /** Purchase price in integer paise (Money). */
  @Prop({ required: true, min: 0 })
  pricePaise!: number;

  /** Virtual capital granted, in integer paise. */
  @Prop({ required: true, min: 1 })
  virtualCapitalPaise!: number;

  @Prop({ type: RulesSubdocSchema, required: true })
  rules!: RulesSubdoc;

  @Prop({ required: true, enum: Object.values(PlanStatus), default: PlanStatus.ACTIVE, index: true })
  status!: PlanStatus;

  /** Bumped on every rules/price edit; challenges snapshot the version they were created from. */
  @Prop({ required: true, default: 1 })
  version!: number;

  @Prop({ default: 0 })
  displayOrder!: number;
}

export type PlanDocument = HydratedDocument<Plan>;
export const PlanSchema = SchemaFactory.createForClass(Plan);
