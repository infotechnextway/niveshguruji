import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
class WatchlistItem {
  @Prop({ required: true }) instrumentKey!: string;
  @Prop({ required: true, default: 0 }) sort!: number;
}
const WatchlistItemSchema = SchemaFactory.createForClass(WatchlistItem);

@Schema({ collection: 'watchlists', timestamps: true })
export class Watchlist {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  /** One list per tab — STOCKS/INDICES/OPTIONS/CURRENCY or custom WL1…WL20. */
  @Prop({ required: true })
  tab!: string;

  /** Optional display name for custom lists. */
  @Prop()
  name?: string;

  @Prop({ type: [WatchlistItemSchema], default: [] })
  items!: WatchlistItem[];
}

export type WatchlistDocument = HydratedDocument<Watchlist>;
export const WatchlistSchema = SchemaFactory.createForClass(Watchlist);
WatchlistSchema.index({ userId: 1, tab: 1 }, { unique: true });
