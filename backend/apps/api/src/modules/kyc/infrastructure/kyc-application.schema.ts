import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { KycAppStatus } from '../domain/kyc-state';

@Schema({ _id: false })
class KycDocumentRef {
  @Prop({ required: true, enum: ['PAN', 'ID_PROOF', 'ADDRESS_PROOF', 'SELFIE'] })
  type!: string;

  /** Relative storage key of the AES-256-GCM encrypted blob. */
  @Prop({ required: true })
  fileKey!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  sizeBytes!: number;
}
const KycDocumentRefSchema = SchemaFactory.createForClass(KycDocumentRef);

@Schema({ _id: false })
class KycTimelineEntry {
  @Prop({ required: true })
  at!: Date;

  @Prop({ required: true })
  event!: string;

  @Prop()
  byEmployeeId?: string;

  @Prop()
  note?: string;
}
const KycTimelineEntrySchema = SchemaFactory.createForClass(KycTimelineEntry);

@Schema({ collection: 'kyc_applications', timestamps: true })
export class KycApplication {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(KycAppStatus), index: true })
  status!: KycAppStatus;

  /** Field-encrypted PAN (AES-256-GCM). */
  @Prop({ required: true, select: false })
  panNumberEnc!: string;

  @Prop({ type: [KycDocumentRefSchema], required: true })
  documents!: KycDocumentRef[];

  @Prop({ type: Types.ObjectId })
  reviewerId?: Types.ObjectId;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: [KycTimelineEntrySchema], default: [] })
  timeline!: KycTimelineEntry[];
}

export type KycApplicationDocument = HydratedDocument<KycApplication>;
export const KycApplicationSchema = SchemaFactory.createForClass(KycApplication);
KycApplicationSchema.index({ status: 1, createdAt: 1 });
// One live (non-terminal) application per user.
KycApplicationSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } } },
);
