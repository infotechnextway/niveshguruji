import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LedgerType = 'CREDIT' | 'DEBIT' | 'CHARGE' | 'PNL' | 'ADJUST';

/**
 * Append-only ledger (NFR-4). P3 writes the opening CREDIT (virtual capital);
 * P5 appends CHARGE/PNL, P7 appends reward ADJUST. Never updated or deleted.
 */
@Schema({ collection: 'ledger_entries', timestamps: { createdAt: 'at', updatedAt: false } })
export class LedgerEntry {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  challengeId!: Types.ObjectId;

  @Prop({ required: true, enum: ['CREDIT', 'DEBIT', 'CHARGE', 'PNL', 'ADJUST'] })
  type!: LedgerType;

  @Prop({ required: true })
  amountPaise!: number; // signed: credit positive, debit/charge negative

  @Prop({ required: true })
  balanceAfterPaise!: number;

  @Prop({ required: true })
  refType!: string; // 'PAYMENT' | 'TRADE' | 'REWARD' | ...

  @Prop({ type: Types.ObjectId })
  refId?: Types.ObjectId;

  @Prop()
  note?: string;

  at!: Date;
}

export type LedgerEntryDocument = HydratedDocument<LedgerEntry>;
export const LedgerEntrySchema = SchemaFactory.createForClass(LedgerEntry);
LedgerEntrySchema.index({ userId: 1, at: -1 });
LedgerEntrySchema.index({ challengeId: 1, at: -1 });
