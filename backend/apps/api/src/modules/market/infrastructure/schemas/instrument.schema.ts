import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Instrument master, synced daily from Upstox. One row per tradable
 * instrument. Options carry expiry/strike/optType; the option chain is built
 * by querying this collection.
 */
@Schema({ collection: 'instruments', timestamps: true })
export class Instrument {
  @Prop({ required: true, unique: true })
  instrumentKey!: string; // Upstox instrument_key

  @Prop({ required: true, index: true })
  symbol!: string; // trading symbol, e.g. "RELIANCE", "NIFTY 50"

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, enum: ['NSE', 'BSE'] })
  exchange!: string;

  @Prop({ required: true, enum: ['EQ', 'FO', 'CUR', 'INDEX'], index: true })
  segment!: string;

  @Prop({ required: true, default: 1 })
  lotSize!: number;

  @Prop({ required: true, default: 0.05 })
  tickSize!: number;

  @Prop()
  freezeQty?: number;

  // Derivatives only:
  @Prop()
  expiry?: string; // YYYY-MM-DD

  @Prop()
  strike?: number;

  @Prop({ enum: ['CE', 'PE'] })
  optType?: string;

  /** For options/futures — the underlying's instrumentKey (chain grouping). */
  @Prop({ index: true })
  underlyingKey?: string;

  @Prop({ required: true, default: true, index: true })
  enabled!: boolean;

  /** Angel One SmartAPI token id (from instrument master). */
  @Prop({ index: true })
  angelToken?: string;

  /** Angel exchange type: 1 NSE_CM, 2 NSE_FO, 3 BSE_CM, 4 BSE_FO, 5 MCX_FO */
  @Prop()
  angelExchangeType?: number;

  /** Dhan security ID (from scrip master CSV). */
  @Prop({ index: true })
  dhanSecurityId?: string;

  /** Dhan exchange segment, e.g. NSE_EQ, NSE_FNO, BSE_EQ, IDX_I. */
  @Prop()
  dhanExchangeSegment?: string;
}

export type InstrumentDocument = HydratedDocument<Instrument>;
export const InstrumentSchema = SchemaFactory.createForClass(Instrument);
InstrumentSchema.index({ segment: 1, enabled: 1 });
InstrumentSchema.index({ underlyingKey: 1, expiry: 1, strike: 1 });
InstrumentSchema.index({ symbol: 'text', name: 'text' });
InstrumentSchema.index({ symbol: 1 });
InstrumentSchema.index({ exchange: 1, segment: 1, symbol: 1 });
