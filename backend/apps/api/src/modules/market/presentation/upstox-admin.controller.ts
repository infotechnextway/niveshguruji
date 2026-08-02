import { Body, Controller, Get, HttpStatus, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { AppException, AuditService } from '@app/shared';
import { EmployeeAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal, requestContext } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';
import { PermissionsGuard, RequirePermissions } from '../../admin/presentation/permissions.guard';
import { UpstoxCredentialsService } from '../application/upstox-credentials.service';
import { MarketFeedModeService } from '../application/market-feed-mode.service';

class UpdateUpstoxDto {
  @IsOptional() @IsString()
  accessToken?: string;

  @IsOptional() @IsString()
  apiKey?: string;

  @IsOptional() @IsString()
  apiSecret?: string;

  @IsOptional() @IsBoolean()
  clearAccessToken?: boolean;

  @IsOptional() @IsBoolean()
  clearApiKey?: boolean;

  @IsOptional() @IsBoolean()
  clearApiSecret?: boolean;
}

@Controller('admin/integrations/upstox')
@UseGuards(EmployeeAuthGuard, PermissionsGuard)
export class UpstoxAdminController {
  constructor(
    private readonly credentials: UpstoxCredentialsService,
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
    @Body() dto: UpdateUpstoxDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    try {
      const status = await this.credentials.update(dto, p.sub);
      await this.audit.record({
        actorType: 'EMPLOYEE',
        actorId: p.sub,
        action: 'UPSTOX_CREDENTIALS_UPDATED',
        entity: 'integration',
        entityId: 'upstox',
        after: {
          accessTokenSet: status.accessTokenSet,
          apiKeySet: status.apiKeySet,
          apiSecretSet: status.apiSecretSet,
          source: status.source,
        },
        ip: requestContext(req).ip,
      });
      return { ...status, feedMode: this.feedMode.getFeedMode() };
    } catch (err) {
      throw new AppException('UPSTOX_CONFIG_INVALID', (err as Error).message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  @Post('test')
  @RequirePermissions('instruments.manage')
  test() {
    return this.credentials.testConnection();
  }
}
