import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { AppException, DomainError, Result } from '@app/shared';
import { WatchlistService } from '../application/watchlist.service';
import { UserAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';
import { WatchlistItemDto, WatchlistParamDto, WatchlistReorderDto } from './dto/market.dtos';

type Tab = string;

function unwrap<T>(r: Result<T, DomainError>): T {
  if (r.isFail) {
    const status =
      r.error.code === 'NOT_FOUND' ? HttpStatus.NOT_FOUND
      : r.error.code === 'WATCHLIST_FULL' ? HttpStatus.CONFLICT
        : r.error.code === 'UNAUTHORIZED' ? HttpStatus.UNAUTHORIZED
          : HttpStatus.UNPROCESSABLE_ENTITY;
    throw AppException.fromDomain(r.error, status);
  }
  return r.value;
}

class CreateWatchlistDto {
  @IsString() @Length(1, 40) name!: string;
}

class RenameWatchlistDto {
  @IsString() @Length(1, 40) name!: string;
}

@Controller('watchlist')
@UseGuards(UserAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  list(@CurrentPrincipal() p: AccessTokenClaims) {
    return this.watchlist.listTabs(p.sub);
  }

  @Post()
  async create(@CurrentPrincipal() p: AccessTokenClaims, @Body() dto: CreateWatchlistDto) {
    return unwrap(await this.watchlist.createTab(p.sub, dto.name));
  }

  @Put(':tab/name')
  async rename(
    @CurrentPrincipal() p: AccessTokenClaims,
    @Param() param: WatchlistParamDto,
    @Body() dto: RenameWatchlistDto,
  ) {
    return unwrap(await this.watchlist.renameTab(p.sub, param.tab as Tab, dto.name));
  }

  @Get(':tab')
  get(@CurrentPrincipal() p: AccessTokenClaims, @Param() param: WatchlistParamDto) {
    return this.watchlist.get(p.sub, param.tab as Tab);
  }

  @Post(':tab')
  async add(@CurrentPrincipal() p: AccessTokenClaims, @Param() param: WatchlistParamDto, @Body() dto: WatchlistItemDto) {
    return unwrap(await this.watchlist.add(p.sub, param.tab as Tab, dto.instrumentKey));
  }

  @Delete(':tab/:instrumentKey')
  async remove(@CurrentPrincipal() p: AccessTokenClaims, @Param() param: WatchlistParamDto, @Param('instrumentKey') key: string) {
    return unwrap(await this.watchlist.remove(p.sub, param.tab as Tab, decodeURIComponent(key)));
  }

  @Put(':tab/reorder')
  async reorder(@CurrentPrincipal() p: AccessTokenClaims, @Param() param: WatchlistParamDto, @Body() dto: WatchlistReorderDto) {
    return unwrap(await this.watchlist.reorder(p.sub, param.tab as Tab, dto.orderedKeys));
  }
}
