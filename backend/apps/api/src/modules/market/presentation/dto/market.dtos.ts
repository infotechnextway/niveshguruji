import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

/** Built-in segment tabs + custom WL1…WL20 user lists. */
const TABS = [
  'STOCKS', 'INDICES', 'OPTIONS', 'CURRENCY',
  'WL1', 'WL2', 'WL3', 'WL4', 'WL5', 'WL6', 'WL7', 'WL8', 'WL9', 'WL10',
  'WL11', 'WL12', 'WL13', 'WL14', 'WL15', 'WL16', 'WL17', 'WL18', 'WL19', 'WL20',
] as const;

export class SearchQueryDto {
  @IsOptional() @IsString() @Length(0, 60) q?: string;
  @IsOptional() @IsIn(['EQ', 'FO', 'CUR', 'INDEX']) segment?: string;
  @IsOptional() @IsIn(['NSE', 'BSE']) exchange?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class SegmentListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(500_000) offset?: number;
}

export class QuotesQueryDto {
  @IsString() @Length(1, 4000) keys!: string; // comma-separated instrumentKeys
}

export class CandlesQueryDto {
  @IsString() instrumentKey!: string;
  @Type(() => Number) @IsInt() @Min(0) from!: number;
  @Type(() => Number) @IsInt() @Min(0) to!: number;
  @IsOptional() @IsString() interval?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) limit?: number;
}

export class OptionChainQueryDto {
  @IsString() underlyingKey!: string;
  @IsOptional() @IsString() expiry?: string;
  /** Strikes each side of ATM to return (default 20). 0 = all. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(200) atmSpan?: number;
}

export class WatchlistParamDto {
  @IsIn(TABS) tab!: (typeof TABS)[number];
}

export class WatchlistItemParamDto extends WatchlistParamDto {
  @IsString() @Length(3, 120) instrumentKey!: string;
}

export class WatchlistItemDto {
  @IsString() @Length(3, 120) instrumentKey!: string;
}

export class WatchlistReorderDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) orderedKeys!: string[];
}
