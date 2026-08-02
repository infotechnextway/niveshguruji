import { Body, Controller, Get, HttpStatus, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsBoolean } from 'class-validator';
import { AppException, AuditService } from '@app/shared';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmployeeAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal, requestContext } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';
import { PermissionsGuard, RequirePermissions } from '../../admin/presentation/permissions.guard';
import { Instrument } from '../infrastructure/schemas/instrument.schema';
import { InstrumentSyncService } from '../application/instrument-sync.service';

class ToggleDto {
  @IsBoolean() enabled!: boolean;
}

@Controller('admin/instruments')
@UseGuards(EmployeeAuthGuard, PermissionsGuard)
export class InstrumentAdminController {
  constructor(
    @InjectModel(Instrument.name) private readonly instruments: Model<Instrument>,
    private readonly audit: AuditService,
    private readonly sync: InstrumentSyncService,
  ) {}

  @Get()
  @RequirePermissions('instruments.manage')
  list(@Query('segment') segment?: string, @Query('q') q?: string) {
    const filter: Record<string, unknown> = {};
    if (segment) filter.segment = segment;
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { symbol: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
      ];
    }
    return this.instruments.find(filter).limit(200)
      .select('instrumentKey symbol name segment enabled lotSize exchange').lean();
  }

  @Post('sync')
  @RequirePermissions('instruments.manage')
  async syncFromUpstox(
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    try {
      const result = await this.sync.syncFromUpstox();
      await this.audit.record({
        actorType: 'EMPLOYEE', actorId: p.sub, action: 'INSTRUMENT_SYNC', entity: 'instrument',
        entityId: 'master', after: result, ip: requestContext(req).ip,
      });
      return result;
    } catch (err) {
      throw new AppException('SYNC_FAILED', (err as Error).message, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post('sync/dhan')
  @RequirePermissions('instruments.manage')
  async syncFromDhan(
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    try {
      const result = await this.sync.syncFromDhan();
      await this.audit.record({
        actorType: 'EMPLOYEE', actorId: p.sub, action: 'INSTRUMENT_SYNC_DHAN', entity: 'instrument',
        entityId: 'dhan-master', after: result, ip: requestContext(req).ip,
      });
      return result;
    } catch (err) {
      throw new AppException('SYNC_FAILED', (err as Error).message, HttpStatus.BAD_GATEWAY);
    }
  }

  @Put(':instrumentKey/enabled')
  @RequirePermissions('instruments.manage')
  async toggle(
    @Param('instrumentKey') instrumentKey: string,
    @Body() dto: ToggleDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    const key = decodeURIComponent(instrumentKey);
    const res = await this.instruments.updateOne({ instrumentKey: key }, { $set: { enabled: dto.enabled } });
    if (!res.matchedCount) throw new AppException('NOT_FOUND', 'Instrument not found', HttpStatus.NOT_FOUND);
    await this.audit.record({
      actorType: 'EMPLOYEE', actorId: p.sub, action: 'INSTRUMENT_TOGGLED', entity: 'instrument',
      entityId: key, after: { enabled: dto.enabled }, ip: requestContext(req).ip,
    });
    return { ok: true };
  }
}
