import { Body, Controller, Get, HttpStatus, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { AppException, AuditService } from '@app/shared';
import { EmployeeAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal, requestContext } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';
import { PermissionsGuard, RequirePermissions } from '../../admin/presentation/permissions.guard';
import { DhanCredentialsService } from '../application/dhan-credentials.service';
import { DhanTokenSyncService } from '../application/dhan-token-sync.service';
import { MarketFeedModeService } from '../application/market-feed-mode.service';

class UpdateDhanDto {
  @IsOptional() @IsString()
  clientId?: string;

  @IsOptional() @IsString()
  accessToken?: string;

  @IsOptional() @IsBoolean()
  clearClientId?: boolean;

  @IsOptional() @IsBoolean()
  clearAccessToken?: boolean;
}

class DhanGenerateTokenDto {
  @IsString()
  clientId!: string;

  @IsString()
  pin!: string;

  @IsString()
  totp!: string;
}

@Controller('admin/integrations/dhan')
@UseGuards(EmployeeAuthGuard, PermissionsGuard)
export class DhanAdminController {
  constructor(
    private readonly credentials: DhanCredentialsService,
    private readonly tokenSync: DhanTokenSyncService,
    private readonly feedMode: MarketFeedModeService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('instruments.manage')
  status() {
    return {
      ...this.credentials.getPublicStatus(),
      feedMode: this.feedMode.getFeedMode(),
    };
  }

  @Put()
  @RequirePermissions('instruments.manage')
  async update(
    @Body() dto: UpdateDhanDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    try {
      const status = await this.credentials.update(dto, p.sub);
      await this.audit.record({
        actorType: 'EMPLOYEE',
        actorId: p.sub,
        action: 'DHAN_CREDENTIALS_UPDATED',
        entity: 'integration',
        entityId: 'dhan',
        after: {
          clientId: status.clientId,
          accessTokenSet: status.accessTokenSet,
          source: status.source,
        },
        ip: requestContext(req).ip,
      });
      return { ...status, feedMode: this.feedMode.getFeedMode() };
    } catch (err) {
      throw new AppException('DHAN_CONFIG_INVALID', (err as Error).message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  @Post('generate-token')
  @RequirePermissions('instruments.manage')
  async generateToken(
    @Body() dto: DhanGenerateTokenDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    const result = await this.credentials.generateAccessToken(
      { dhanClientId: dto.clientId, pin: dto.pin, totp: dto.totp },
      p.sub,
    );

    if (result.ok) {
      await this.audit.record({
        actorType: 'EMPLOYEE',
        actorId: p.sub,
        action: 'DHAN_TOKEN_GENERATED',
        entity: 'integration',
        entityId: 'dhan',
        after: {
          clientId: dto.clientId,
          expiryTime: result.expiryTime ?? null,
          dhanClientName: result.dhanClientName ?? null,
        },
        ip: requestContext(req).ip,
      });
    }

    return result;
  }

  @Post('test')
  @RequirePermissions('instruments.manage')
  test() {
    return this.credentials.testConnection();
  }

  @Post('sync-tokens')
  @RequirePermissions('instruments.manage')
  async syncTokens(
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    try {
      const result = await this.tokenSync.syncTokens();
      await this.audit.record({
        actorType: 'EMPLOYEE',
        actorId: p.sub,
        action: 'DHAN_TOKEN_SYNC',
        entity: 'instrument',
        entityId: 'dhan-master',
        after: result,
        ip: requestContext(req).ip,
      });
      return result;
    } catch (err) {
      throw new AppException('DHAN_SYNC_FAILED', (err as Error).message, HttpStatus.BAD_GATEWAY);
    }
  }
}
