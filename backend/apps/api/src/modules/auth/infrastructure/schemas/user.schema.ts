import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { KycStatus, UserStatus } from '../../domain/auth.types';

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ default: false })
  emailVerified!: boolean;

  /** E.164 without spaces, Indian numbers: +91XXXXXXXXXX */
  @Prop({ required: true, unique: true, match: /^\+91[6-9]\d{9}$/ })
  mobile!: string;

  @Prop({ default: false })
  mobileVerified!: boolean;

  @Prop({ required: true, trim: true, maxlength: 30 })
  username!: string;

  /** Case-insensitive uniqueness key (US-AUTH-1). */
  @Prop({ required: true, unique: true })
  usernameLower!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true, enum: Object.values(UserStatus), default: UserStatus.PENDING_MOBILE, index: true })
  status!: UserStatus;

  @Prop({ required: true, enum: Object.values(KycStatus), default: KycStatus.NOT_SUBMITTED })
  kycStatus!: KycStatus;

  @Prop({ required: true, unique: true })
  referralCode!: string;

  @Prop()
  referredBy?: string;

  @Prop()
  profilePictureKey?: string;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
