import {
  ArrayNotEmpty, IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,72}$/;
const PASSWORD_MSG = 'Employee password must be 12–72 chars with upper, lower and a digit';

export class CreateEmployeeDto {
  @IsEmail()
  email!: string;

  @IsString() @Length(2, 100)
  name!: string;

  @Matches(PASSWORD_RULE, { message: PASSWORD_MSG })
  password!: string;

  @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  roles!: string[];
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @Length(2, 100)
  name?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  roles?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  permAllow?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  permDeny?: string[];

  @IsOptional() @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';
}

export class ResetEmployeePasswordDto {
  @Matches(PASSWORD_RULE, { message: PASSWORD_MSG })
  password!: string;
}

export class UpdateRoleDto {
  @IsArray() @IsString({ each: true })
  permissions!: string[];
}

export class UserListQueryDto {
  @IsOptional() @IsString() @Length(1, 100)
  search?: string;

  @IsOptional()
  @IsIn(['PENDING_MOBILE', 'PENDING_EMAIL', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED'])
  status?: 'PENDING_MOBILE' | 'PENDING_EMAIL' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

export class SuspendUserDto {
  @IsString() @Length(5, 500)
  reason!: string;
}

export class RejectUserDto {
  @IsString() @Length(5, 500)
  reason!: string;
}

export class SetConfigDto {
  @IsString() @Length(3, 100)
  key!: string;

  /** Validated against the key's zod schema in AppConfigService. */
  value!: unknown;
}

export class AuditQueryDto {
  @IsOptional() @IsString() @Length(1, 60)
  entity?: string;

  @IsOptional() @IsString() @Length(1, 60)
  entityId?: string;

  @IsOptional() @IsString() @Length(1, 60)
  actorId?: string;
}
