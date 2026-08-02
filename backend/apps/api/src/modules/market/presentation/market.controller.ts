import { Controller, Get, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { AppException, DomainError, Result } from '@app/shared';
import { InstrumentService } from '../application/instrument.service';
import { UserAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { ExchangeCalendarService } from '@app/shared';
import {
  CandlesQueryDto, OptionChainQueryDto, QuotesQueryDto, SearchQueryDto, SegmentListQueryDto,
} from './dto/market.dtos';

function unwrap<T>(r: Result<T, DomainError>): T {
  if (r.isFail) {
    const status =
      r.error.code === 'NOT_FOUND' ? HttpStatus.NOT_FOUND
        : r.error.code === 'UPSTOX_TOKEN_MISSING' ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.UNPROCESSABLE_ENTITY;
    throw AppException.fromDomain(r.error, status);
  }
  return r.value;
}

@Controller('market')
@UseGuards(UserAuthGuard)
export class MarketController {
  constructor(
    private readonly instruments: InstrumentService,
    private readonly calendar: ExchangeCalendarService,
  ) {}

  @Get('search')
  search(@Query() q: SearchQueryDto) {
    return this.instruments.search(q.q ?? '', q.segment, q.limit ?? 50, q.exchange);
  }

  @Get('instruments/:instrumentKey')
  async resolve(@Param('instrumentKey') instrumentKey: string) {
    const key = decodeURIComponent(instrumentKey);
    const row = await this.instruments.getByKey(key);
    if (!row) throw new AppException('NOT_FOUND', 'Instrument not found', HttpStatus.NOT_FOUND);
    return row;
  }

  @Get('segment/:segment')
  bySegment(@Param('segment') segment: string, @Query() q: SegmentListQueryDto) {
    return this.instruments.listBySegment(segment, q.limit ?? 100, q.offset ?? 0);
  }

  @Get('status')
  status() {
    return {
      eqOpen: this.calendar.isMarketOpen('EQ'),
      curOpen: this.calendar.isMarketOpen('CUR'),
    };
  }

  @Get('quotes')
  quotes(@Query() q: QuotesQueryDto) {
    const keys = q.keys.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 200);
    return this.instruments.quotes(keys);
  }

  @Get('candles')
  async candles(@Query() q: CandlesQueryDto) {
    return unwrap(await this.instruments.candles(q.instrumentKey, q.from, q.to, q.interval, q.limit));
  }

  @Get('option-chain')
  async optionChain(@Query() q: OptionChainQueryDto) {
    return unwrap(await this.instruments.optionChain(q.underlyingKey, q.expiry, q.atmSpan ?? 20));
  }

  @Get('expiries/:underlyingKey')
  expiries(@Param('underlyingKey') underlyingKey: string) {
    return this.instruments.expiries(decodeURIComponent(underlyingKey));
  }
}
