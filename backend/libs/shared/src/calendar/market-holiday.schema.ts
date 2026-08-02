import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'market_holidays', timestamps: true })
export class MarketHoliday {
  /** Date as YYYY-MM-DD in IST. */
  @Prop({ required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ })
  date!: string;

  @Prop({ type: [String], required: true, enum: ['NSE', 'BSE'], default: ['NSE', 'BSE'] })
  exchanges!: string[];

  @Prop({ required: true })
  description!: string;
}

export type MarketHolidayDocument = HydratedDocument<MarketHoliday>;
export const MarketHolidaySchema = SchemaFactory.createForClass(MarketHoliday);
