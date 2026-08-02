import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'roles', timestamps: true })
export class Role {
  @Prop({ required: true, unique: true, uppercase: true })
  key!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: [String], default: [] })
  permissions!: string[];

  /** SUPER_ADMIN is locked: cannot be edited or reduced. */
  @Prop({ default: false })
  locked!: boolean;
}

export type RoleDocument = HydratedDocument<Role>;
export const RoleSchema = SchemaFactory.createForClass(Role);
