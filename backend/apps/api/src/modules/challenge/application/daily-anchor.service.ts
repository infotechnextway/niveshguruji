import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppConfigService, ExchangeCalendarService, toIst } from '@app/shared';
import { Challenge } from '../../plans/infrastructure/schemas/challenge.schema';

/**
 * At the start of each trading day, reset each active challenge's
 * dayStartEquityPaise anchor for daily-drawdown. Anchor source is config:
 * PREV_DAY_CLOSE (default) uses the challenge's current equity (which is the
 * prior day's closing equity); INITIAL_CAPITAL uses the granted capital.
 */
@Injectable()
export class DailyAnchorService implements OnModuleInit {
  private readonly logger = new Logger(DailyAnchorService.name);
  private lastRunDate = '';

  constructor(
    @InjectModel(Challenge.name) private readonly challenges: Model<Challenge>,
    private readonly calendar: ExchangeCalendarService,
    private readonly appConfig: AppConfigService,
  ) {}

  onModuleInit(): void {
    const timer = setInterval(() => void this.maybeRun(), 60_000);
    timer.unref();
  }

  private async maybeRun(): Promise<void> {
    const now = new Date();
    if (!this.calendar.isTradingDay(now)) return;
    const { dateKey, minutesOfDay } = toIst(now);
    // Run once per trading day, shortly before the equity market open (09:14).
    if (minutesOfDay < 9 * 60 + 14 || minutesOfDay > 9 * 60 + 20 || this.lastRunDate === dateKey) return;
    this.lastRunDate = dateKey;

    const anchor = this.appConfig.get('challenge.dailyDD.anchor');
    const active = await this.challenges.find({ status: { $in: ['PENDING', 'ACTIVE'] } });
    for (const c of active) {
      c.dayStartEquityPaise = anchor === 'INITIAL_CAPITAL' ? c.virtualCapitalPaise : c.equityPaise;
      await c.save();
    }
    this.logger.log(`Daily anchor reset for ${active.length} challenges (anchor=${anchor})`);
  }
}
