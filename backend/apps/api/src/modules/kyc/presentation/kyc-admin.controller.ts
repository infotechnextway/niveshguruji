import {
  Body, Controller, Get, HttpStatus, Param, Post, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException, DomainError, Result } from '@app/shared';
import { KycService } from '../application/kyc.service';
import { KycQueueQueryDto, RejectKycDto } from './dto/kyc.dtos';
import { EmployeeAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal, requestContext } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';
import { PermissionsGuard, RequirePermissions } from '../../admin/presentation/permissions.guard';
import { KYC_DOCUMENT_TYPES, KycAppStatus, KycDocumentType } from '../domain/kyc-state';

function unwrap<T>(result: Result<T, DomainError>): T {
  if (result.isFail) {
    const status =
      result.error.code === 'NOT_FOUND'
        ? HttpStatus.NOT_FOUND
        : result.error.code === 'KYC_CLAIMED_BY_OTHER'
          ? HttpStatus.CONFLICT
          : HttpStatus.UNPROCESSABLE_ENTITY;
    throw AppException.fromDomain(result.error, status);
  }
  return result.value;
}

@Controller('admin/kyc')
@UseGuards(EmployeeAuthGuard, PermissionsGuard)
export class KycAdminController {
  constructor(private readonly kyc: KycService) {}

  @Get('queue')
  @RequirePermissions('kyc.view')
  async queue(@Query() query: KycQueueQueryDto) {
    return this.kyc.queue(query.status as KycAppStatus | undefined, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get(':id')
  @RequirePermissions('kyc.view')
  async detail(@Param('id') id: string) {
    return unwrap(await this.kyc.detail(id));
  }

  @Get(':id/document/:type')
  @RequirePermissions('kyc.view')
  async document(@Param('id') id: string, @Param('type') type: string, @Res() res: Response) {
    if (!KYC_DOCUMENT_TYPES.includes(type as KycDocumentType)) {
      throw new AppException('NOT_FOUND', 'Unknown document type', HttpStatus.NOT_FOUND);
    }
    const doc = unwrap(await this.kyc.document(id, type as KycDocumentType));
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Cache-Control', 'no-store'); // never cache identity documents
    res.setHeader('Content-Disposition', `inline; filename="${type.toLowerCase()}"`);
    res.send(doc.buffer);
  }

  @Post(':id/claim')
  @RequirePermissions('kyc.review')
  async claim(@Param('id') id: string, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.kyc.claim(id, p.sub, requestContext(req).ip));
  }

  @Post(':id/approve')
  @RequirePermissions('kyc.review')
  async approve(@Param('id') id: string, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.kyc.approve(id, p.sub, requestContext(req).ip));
  }

  @Post(':id/reject')
  @RequirePermissions('kyc.review')
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectKycDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    return unwrap(await this.kyc.reject(id, p.sub, dto.reason, requestContext(req).ip));
  }
}
