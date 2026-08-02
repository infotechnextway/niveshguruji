import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EVENT_BUS, EventBus, ExchangeCalendarService } from '@app/shared';

export interface HeartbeatPayload {
  process: 'engine';
  marketOpenEq: boolean;
  marketOpenCur: boolean;
  at: string;
}

/**
 * Publishes "platform.engine.heartbeat" every 15s. Serves two real purposes:
 * 1. End-to-end proof that Redis Pub/Sub event flow works across containers
 *    (subscribed by ops tooling / future admin dashboard health widget).
 * 2. Exercises the calendar service continuously so config/holiday drift
 *    surfaces in logs immediately, not on the first trade.
 */
@Injectable()
export class EngineHeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EngineHeartbeatService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(EVENT_BUS) private readonly bus: EventBus,
    private readonly calendar: ExchangeCalendarService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      const payload: HeartbeatPayload = {
        process: 'engine',
        marketOpenEq: this.calendar.isMarketOpen('EQ'),
        marketOpenCur: this.calendar.isMarketOpen('CUR'),
        at: new Date().toISOString(),
      };
      this.bus
        .publish('platform.engine.heartbeat', payload)
        .catch((err) => this.logger.error(`Heartbeat publish failed: ${err.message}`));
    }, 15_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
