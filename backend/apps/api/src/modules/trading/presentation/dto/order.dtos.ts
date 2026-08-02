import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, IsString, Length, Min, ValidateNested } from 'class-validator';

class TriggerDto {
  @IsIn(['STOP_LOSS', 'TARGET']) kind!: 'STOP_LOSS' | 'TARGET';
  @IsInt() @IsPositive() pricePaise!: number;
}

export class PlaceOrderDto {
  @IsString() @Length(6, 40) challengeId!: string;
  @IsString() @Length(3, 120) instrumentKey!: string;
  @IsIn(['BUY', 'SELL']) side!: 'BUY' | 'SELL';
  @IsIn(['MARKET', 'LIMIT']) type!: 'MARKET' | 'LIMIT';
  @IsIn(['INTRADAY', 'CARRY_FORWARD']) product!: 'INTRADAY' | 'CARRY_FORWARD';
  @IsInt() @IsPositive() qty!: number;

  @IsOptional() @IsInt() @Min(1) limitPricePaise?: number;

  /** Optional. Providing this attaches SL or Target — never both (single field). */
  @IsOptional() @ValidateNested() @Type(() => TriggerDto) trigger?: TriggerDto;
}
