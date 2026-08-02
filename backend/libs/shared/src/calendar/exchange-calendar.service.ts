import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MarketHoliday } from './market-holiday.schema';
import { AppConfigService } from '../config/app-config.service';
import { hhmmToMinutes, toIst } from './ist-time';

export type Segment = 'EQ' | 'CUR';

/**
 * Exchange calendar — trading-day and market-window authority for the whole
 * platform. Windows come from AppConfigService (never hardcoded); holidays
 * come from market_holidays (admin-managed), cached and refreshed hourly.
 */
@Injectable()
export class ExchangeCalendarService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeCalendarService.name);
  private holidays = new Set<string>();
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @InjectModel(MarketHoliday.name) private readonly model: Model<MarketHoliday>,
    private readonly appConfig: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshHolidays();
    this.timer = setInterval(() => {
      this.refreshHolidays().catch((err) => this.logger.error(`Holiday refresh failed: ${err.message}`));
    }, 60 * 60 * 1000);
    this.timer.unref();
  }

  async refreshHolidays(): Promise<void> {
    const rows = await this.model.find().lean();
    this.holidays = new Set(rows.map((r) => r.date));
  }

  isTradingDay(now: Date = new Date()): boolean {
    const { dateKey, dayOfWeek } = toIst(now);
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    return !this.holidays.has(dateKey);
  }

  isMarketOpen(segment: Segment, now: Date = new Date()): boolean {
    if (!this.isTradingDay(now)) return false;
    const window = this.appConfig.get(segment === 'EQ' ? 'market.window.EQ' : 'market.window.CUR');
    const { minutesOfDay } = toIst(now);
    return minutesOfDay >= hhmmToMinutes(window.open) && minutesOfDay < hhmmToMinutes(window.close);
  }

  /** IST date key for trading-day counting (US-CHG rule 5 in §4.3). */
  tradingDateKey(now: Date = new Date()): string {
    return toIst(now).dateKey;
  }

  squareOffMinute(segment: Segment): number {
    return hhmmToMinutes(this.appConfig.get(segment === 'EQ' ? 'trading.squareoff.EQ' : 'trading.squareoff.CUR'));
  }
}
