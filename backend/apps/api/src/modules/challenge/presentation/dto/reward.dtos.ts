import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class RewardQueueQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

export class ApproveRewardDto {
  @IsOptional() @IsInt() @Min(0) overrideAmountPaise?: number;
  @IsOptional() @IsString() @Length(0, 500) reason?: string;
}

export class RejectRewardDto {
  @IsString() @Length(5, 500) reason!: string;
}

export class MarkPaidDto {
  @IsOptional() @IsString() @Length(0, 500) reason?: string;
}
