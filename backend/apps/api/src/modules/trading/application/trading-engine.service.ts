import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EVENT_BUS, EventBus, ExchangeCalendarService, Quote, quoteChannel } from '@app/shared';
import { toIst } from '@app/shared';
import { ExecutionService } from './execution.service';
import { Order } from '../infrastructure/schemas/order.schema';
import { Challenge } from '../../plans/infrastructure/schemas/challenge.schema';

/**
 * Engine-side driver for the VEE. Subscribes to quote channels for instruments
 * that have OPEN orders, routing each tick into ExecutionService.onQuote (which
 * fills crossable limits and fires SL/Target). Also runs the per-minute
 * square-off check that flattens INTRADAY positions at the segment cutoff.
 */
@Injectable()
export class TradingEngineService implements OnModuleInit {
  private readonly logger = new Logger(TradingEngineService.name);
  private readonly subscribed = new Set<string>();
  private lastSquareOffDate = '';

  constructor(
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(Challenge.name) private readonly challenges: Model<Challenge>,
    private readonly execution: ExecutionService,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
    private readonly calendar: ExchangeCalendarService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshSubscriptions();
    const refresh = setInterval(() => void this.refreshSubscriptions(), 15_000);
    refresh.unref();
    const squareOff = setInterval(() => void this.checkSquareOff(), 30_000);
    squareOff.unref();
    this.logger.log('Trading engine (VEE tick loop) started');
  }

  /** Subscribe to quote channels for every instrument that currently has an open order. */
  private async refreshSubscriptions(): Promise<void> {
    const keys = await this.orders.distinct('instrumentKey', { status: 'OPEN' });
    for (const key of keys as string[]) {
      if (this.subscribed.has(key)) continue;
      this.subscribed.add(key);
      await this.bus.subscribe<Quote>(quoteChannel(key), (event) => void this.execution.onQuote(event.payload));
    }
  }

  /** Flatten intraday positions once, at/after the equity square-off minute. */
  private async checkSquareOff(): Promise<void> {
    const now = new Date();
    if (!this.calendar.isTradingDay(now)) return;
    const { minutesOfDay, dateKey } = toIst(now);
    const cutoff = this.calendar.squareOffMinute('EQ');
    if (minutesOfDay < cutoff || this.lastSquareOffDate === dateKey) return;

    this.lastSquareOffDate = dateKey;
    const active = await this.challenges.find({ status: { $in: ['PENDING', 'ACTIVE'] } }).select('_id').lean();
    this.logger.log(`Intraday square-off for ${active.length} challenges`);
    for (const c of active) {
      await this.execution.squareOffIntraday(String(c._id)).catch((err) =>
        this.logger.error(`Square-off failed for ${String(c._id)}: ${err.message}`),
      );
    }
  }
}
