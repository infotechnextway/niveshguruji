import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitKycDto {
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, { message: 'PAN must match the format ABCDE1234F' })
  panNumber!: string;
}

export class KycQueueQueryDto {
  @IsOptional() @IsIn(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'])
  status?: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

export class RejectKycDto {
  @IsString() @Length(5, 500)
  reason!: string;
}
