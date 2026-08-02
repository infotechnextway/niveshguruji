import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Admin-side principals. Role/permission resolution (allow/deny overrides)
 * is delivered in P2; the fields exist now so P1 tokens can carry roles.
 */
@Schema({ collection: 'employees', timestamps: true })
export class Employee {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ type: [String], default: [] })
  roles!: string[];

  @Prop({ type: [String], default: [] })
  permAllow!: string[];

  @Prop({ type: [String], default: [] })
  permDeny!: string[];

  @Prop({ default: false })
  totpEnabled!: boolean;

  /** AES-GCM encrypted TOTP secret (never stored in plaintext). */
  @Prop({ select: false })
  totpSecretEnc?: string;

  @Prop({ required: true, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE' })
  status!: string;
}

export type EmployeeDocument = HydratedDocument<Employee>;
export const EmployeeSchema = SchemaFactory.createForClass(Employee);
