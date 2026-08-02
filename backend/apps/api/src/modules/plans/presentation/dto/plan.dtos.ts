import { Type } from 'class-transformer';
import {
  ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested,
} from 'class-validator';

export class RulesDto {
  @IsNumber() @Min(0.1) @Max(100) profitTargetPct!: number;
  @IsNumber() @Min(0.1) @Max(100) maxDrawdownPct!: number;
  @IsNumber() @Min(0.1) @Max(100) dailyDrawdownPct!: number;
  @IsIn(['PREV_DAY_CLOSE', 'INITIAL_CAPITAL']) drawdownAnchor!: string;
  @IsInt() @Min(0) @Max(365) minTradingDays!: number;
  @IsInt() @Min(1) @Max(365) expiryDays!: number;
  @IsNumber() @Min(0) @Max(100) rewardPct!: number;
  @IsArray() @ArrayNotEmpty() @IsIn(['EQ', 'FO', 'CUR'], { each: true }) segments!: string[];
}

export class CreatePlanDto {
  @IsString() @Length(2, 120) name!: string;
  @Matches(/^[a-z0-9-]{2,60}$/, { message: 'slug: lowercase letters, digits and hyphens' }) slug!: string;
  @IsOptional() @IsString() @Length(0, 1000) description?: string;
  @IsNumber() @Min(0) priceRupees!: number;
  @IsNumber() @Min(1) virtualCapitalRupees!: number;
  @ValidateNested() @Type(() => RulesDto) rules!: RulesDto;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}

export class UpdatePlanDto {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() @Length(0, 1000) description?: string;
  @IsOptional() @IsNumber() @Min(0) priceRupees?: number;
  @IsOptional() @IsNumber() @Min(1) virtualCapitalRupees?: number;
  @IsOptional() @ValidateNested() @Type(() => RulesDto) rules?: RulesDto;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}

export class PlanStatusDto {
  @IsIn(['ACTIVE', 'ARCHIVED']) status!: 'ACTIVE' | 'ARCHIVED';
}

export class CreateOrderDto {
  @IsString() @Length(6, 40) planId!: string;
}

export class ConfirmCheckoutDto {
  @IsString() orderId!: string;
  @IsString() paymentId!: string;
  @IsString() signature!: string;
}

export class PaymentListQueryDto {
  @IsOptional() @IsIn(['CREATED', 'CAPTURED', 'ACTIVATED', 'FAILED', 'REFUNDED'])
  status?: 'CREATED' | 'CAPTURED' | 'ACTIVATED' | 'FAILED' | 'REFUNDED';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class RefundDto {
  @IsString() @Length(5, 500) reason!: string;
}
