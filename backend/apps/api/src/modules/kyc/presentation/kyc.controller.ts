import {
  Body, Controller, Get, HttpStatus, Post, Req, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AppException, DomainError, Result } from '@app/shared';
import { KycService, UploadedDoc } from '../application/kyc.service';
import { SubmitKycDto } from './dto/kyc.dtos';
import { UserAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';
import { KYC_MAX_FILE_BYTES, KycDocumentType } from '../domain/kyc-state';

function unwrap<T>(result: Result<T, DomainError>): T {
  if (result.isFail) {
    const status =
      result.error.code === 'NOT_FOUND'
        ? HttpStatus.NOT_FOUND
        : result.error.code === 'KYC_ALREADY_PENDING' || result.error.code === 'KYC_ALREADY_APPROVED'
          ? HttpStatus.CONFLICT
          : HttpStatus.UNPROCESSABLE_ENTITY;
    throw AppException.fromDomain(result.error, status);
  }
  return result.value;
}

const FIELDS = [
  { name: 'pan', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
];
const FIELD_TO_TYPE: Record<string, KycDocumentType> = {
  pan: 'PAN', idProof: 'ID_PROOF', addressProof: 'ADDRESS_PROOF', selfie: 'SELFIE',
};

@Controller('kyc')
@UseGuards(UserAuthGuard)
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get('status')
  async status(@CurrentPrincipal() principal: AccessTokenClaims) {
    return this.kyc.status(principal.sub);
  }

  @Post('submit')
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 300_000 } })
  @UseInterceptors(FileFieldsInterceptor(FIELDS, { limits: { fileSize: KYC_MAX_FILE_BYTES, files: 4 } }))
  async submit(
    @CurrentPrincipal() principal: AccessTokenClaims,
    @Body() dto: SubmitKycDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[] | undefined>,
  ) {
    const docs: UploadedDoc[] = [];
    for (const [field, type] of Object.entries(FIELD_TO_TYPE)) {
      const file = files?.[field]?.[0];
      if (file) {
        docs.push({ type, buffer: file.buffer, mimeType: file.mimetype, sizeBytes: file.size });
      }
    }
    return unwrap(await this.kyc.submit(principal.sub, dto.panNumber, docs));
  }
}
