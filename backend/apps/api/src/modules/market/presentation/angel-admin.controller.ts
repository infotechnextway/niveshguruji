import { Body, Controller, Get, HttpStatus, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { AppException, AuditService } from '@app/shared';
import { EmployeeAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal, requestContext } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';
import { PermissionsGuard, RequirePermissions } from '../../admin/presentation/permissions.guard';
import { AngelCredentialsService } from '../application/angel-credentials.service';
import { AngelTokenSyncService } from '../application/angel-token-sync.service';
import {
  MARKET_FEED_MODES,
  MarketFeedMode,
  MarketFeedModeService,
} from '../application/market-feed-mode.service';

class UpdateAngelDto {
  @IsOptional() @IsString()
  apiKey?: string;

  @IsOptional() @IsString()
  clientCode?: string;

  @IsOptional() @IsString()
  jwtToken?: string;

  @IsOptional() @IsString()
  feedToken?: string;

  @IsOptional() @IsBoolean()
  clearApiKey?: boolean;

  @IsOptional() @IsBoolean()
  clearJwtToken?: boolean;

  @IsOptional() @IsBoolean()
  clearFeedToken?: boolean;

  @IsOptional() @IsBoolean()
  clearClientCode?: boolean;
}

class AngelLoginDto {
  @IsString()
  password!: string;

  @IsString()
  totp!: string;
}

class SetFeedModeDto {
  @IsIn([...MARKET_FEED_MODES])
  feedMode!: MarketFeedMode;
}

@Controller('admin/integrations/angel')
@UseGuards(EmployeeAuthGuard, PermissionsGuard)
export class AngelAdminController {
  constructor(
    private readonly credentials: AngelCredentialsService,
    private readonly tokenSync: AngelTokenSyncService,
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
    @Body() dto: UpdateAngelDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    try {
      const status = await this.credentials.update(dto, p.sub);
      await this.audit.record({
        actorType: 'EMPLOYEE',
        actorId: p.sub,
        action: 'ANGEL_CREDENTIALS_UPDATED',
        entity: 'integration',
        entityId: 'angel',
        after: {
          apiKeySet: status.apiKeySet,
          clientCode: status.clientCode,
          jwtTokenSet: status.jwtTokenSet,
          feedTokenSet: status.feedTokenSet,
          source: status.source,
        },
        ip: requestContext(req).ip,
      });
      return { ...status, feedMode: this.feedMode.getFeedMode() };
    } catch (err) {
      throw new AppException('ANGEL_CONFIG_INVALID', (err as Error).message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  @Put('feed-mode')
  @RequirePermissions('instruments.manage')
  async setFeedMode(
    @Body() dto: SetFeedModeDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    try {
      const mode = await this.feedMode.setFeedMode(dto.feedMode, p.sub);
      await this.audit.record({
        actorType: 'EMPLOYEE',
        actorId: p.sub,
        action: 'FEED_MODE_UPDATED',
        entity: 'integration',
        entityId: 'market-feed',
        after: { feedMode: mode },
        ip: requestContext(req).ip,
      });
      return { feedMode: mode };
    } catch (err) {
      throw new AppException('FEED_MODE_INVALID', (err as Error).message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  @Post('login')
  @RequirePermissions('instruments.manage')
  async login(
    @Body() dto: AngelLoginDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    try {
      const status = await this.credentials.loginByPassword(dto, p.sub);
      await this.audit.record({
        actorType: 'EMPLOYEE',
        actorId: p.sub,
        action: 'ANGEL_LOGIN',
        entity: 'integration',
        entityId: 'angel',
        after: { jwtTokenSet: status.jwtTokenSet, feedTokenSet: status.feedTokenSet },
        ip: requestContext(req).ip,
      });
      return { ...status, feedMode: this.feedMode.getFeedMode() };
    } catch (err) {
      throw new AppException('ANGEL_LOGIN_FAILED', (err as Error).message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
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
        action: 'ANGEL_TOKEN_SYNC',
        entity: 'instrument',
        entityId: 'angel-master',
        after: result,
        ip: requestContext(req).ip,
      });
      return result;
    } catch (err) {
      throw new AppException('ANGEL_SYNC_FAILED', (err as Error).message, HttpStatus.BAD_GATEWAY);
    }
  }
}

@Controller('admin/integrations/feed-mode')
@UseGuards(EmployeeAuthGuard, PermissionsGuard)
export class FeedModeAdminController {
  constructor(
    private readonly feedMode: MarketFeedModeService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('instruments.manage')
  get() {
    return { feedMode: this.feedMode.getFeedMode() };
  }

  @Put()
  @RequirePermissions('instruments.manage')
  async set(
    @Body() dto: SetFeedModeDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    const mode = await this.feedMode.setFeedMode(dto.feedMode, p.sub);
    await this.audit.record({
      actorType: 'EMPLOYEE',
      actorId: p.sub,
      action: 'FEED_MODE_UPDATED',
      entity: 'integration',
      entityId: 'market-feed',
      after: { feedMode: mode },
      ip: requestContext(req).ip,
    });
    return { feedMode: mode };
  }
}
