import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Redis from 'ioredis';
import {
  AppConfigService, DomainError, EVENT_BUS, EventBus, ExchangeCalendarService,
  Quote, quoteCacheKey, RedisLockService, REDIS_CLIENT, Result,
} from '@app/shared';
import { Order, OrderDocument } from '../infrastructure/schemas/order.schema';
import { Position } from '../infrastructure/schemas/position.schema';
import { Holding } from '../infrastructure/schemas/holding.schema';
import { Trade } from '../infrastructure/schemas/trade.schema';
import { Challenge } from '../../plans/infrastructure/schemas/challenge.schema';
import { LedgerEntry } from '../../plans/infrastructure/schemas/ledger-entry.schema';
import { Instrument } from '../../market/infrastructure/schemas/instrument.schema';
import { InstrumentService } from '../../market/application/instrument.service';
import { OrderSide, OrderStatus, PlaceOrderCommand, ProductType } from '../domain/order.types';
import { applyFill, PositionState } from '../domain/position-math';
import { computeChargesPaise, limitFillPricePaise, marketFillPricePaise } from '../domain/fill-model';
import { InstrumentInfo, validatePreTrade } from '../domain/pre-trade';

type Segment = 'EQ' | 'CUR';

/**
 * The Virtual Execution Engine. EVERY mutation to a challenge's orders/
 * positions/equity runs inside the per-account Redis lock (ADR-3), so equity
 * and drawdown math are race-free. Used by both REST placement (market orders,
 * limit registration) and the engine's tick loop (limit fills, SL/Target,
 * MTM).
 */
@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(Position.name) private readonly positions: Model<Position>,
    @InjectModel(Holding.name) private readonly holdings: Model<Holding>,
    @InjectModel(Trade.name) private readonly trades: Model<Trade>,
    @InjectModel(Challenge.name) private readonly challenges: Model<Challenge>,
    @InjectModel(LedgerEntry.name) private readonly ledger: Model<LedgerEntry>,
    @InjectModel(Instrument.name) private readonly instruments: Model<Instrument>,
    private readonly instrumentQuotes: InstrumentService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
    private readonly locks: RedisLockService,
    private readonly appConfig: AppConfigService,
    private readonly calendar: ExchangeCalendarService,
  ) {}

  private accountLock(challengeId: string): string {
    return `lock:account:${challengeId}`;
  }

  private segmentOf(instrumentSegment: string): Segment {
    return instrumentSegment === 'CUR' ? 'CUR' : 'EQ';
  }

  private async getQuote(instrumentKey: string): Promise<Quote | null> {
    const cached = await this.redis.get(quoteCacheKey(instrumentKey));
    if (cached) return JSON.parse(cached) as Quote;
    const map = await this.instrumentQuotes.quotes([instrumentKey]);
    return map[instrumentKey] ?? null;
  }

  // ---------------- Placement ----------------

  async placeOrder(cmd: PlaceOrderCommand): Promise<Result<{ orderId: string; status: OrderStatus; filledPricePaise?: number }>> {
    return this.locks.withLock(this.accountLock(cmd.challengeId), 15_000, async () => {
      const challenge = await this.challenges.findById(cmd.challengeId);
      if (!challenge || String(challenge.userId) !== cmd.userId) {
        return Result.fail(DomainError.of('NOT_FOUND', 'Challenge not found'));
      }
      const instrument = await this.instruments.findOne({ instrumentKey: cmd.instrumentKey }).lean();
      if (!instrument) return Result.fail(DomainError.of('NOT_FOUND', 'Instrument not found'));

      const quote = await this.getQuote(cmd.instrumentKey);
      const refPricePaise = cmd.type === 'LIMIT'
        ? (cmd.limitPricePaise ?? 0)
        : quote ? Math.round((cmd.side === 'BUY' ? quote.ask : quote.bid) * 100) : 0;
      const estimatedCostPaise = refPricePaise * cmd.qty;

      const instInfo: InstrumentInfo = {
        instrumentKey: instrument.instrumentKey, segment: instrument.segment,
        lotSize: instrument.lotSize, freezeQty: instrument.freezeQty, enabled: instrument.enabled,
      };
      const validation = validatePreTrade({
        command: cmd,
        instrument: instInfo,
        challenge: { status: challenge.status, segments: challenge.rules.segments, equityPaise: challenge.equityPaise },
        marketOpen: this.calendar.isMarketOpen(this.segmentOf(instrument.segment)),
        estimatedCostPaise,
      });
      if (validation.isFail) return Result.fail(validation.error);

      const order = await this.orders.create({
        userId: new Types.ObjectId(cmd.userId),
        challengeId: new Types.ObjectId(cmd.challengeId),
        instrumentKey: cmd.instrumentKey,
        side: cmd.side, type: cmd.type, product: cmd.product, qty: cmd.qty,
        limitPricePaise: cmd.limitPricePaise,
        trigger: cmd.trigger ? { kind: cmd.trigger.kind, pricePaise: cmd.trigger.pricePaise, armed: false } : undefined,
        status: OrderStatus.OPEN,
        placedAt: new Date(),
      });

      if (cmd.type === 'MARKET') {
        if (!quote) {
          order.status = OrderStatus.REJECTED;
          order.rejectionReason = 'NO_MARKET_DATA';
          await order.save();
          return Result.fail(DomainError.of('NO_MARKET_DATA', 'No live price available for this instrument'));
        }
        const slippageBps = this.appConfig.get('trading.slippage.bps');
        const fillPrice = marketFillPricePaise(quote, cmd.side as OrderSide, slippageBps);
        await this.settleFill(order, fillPrice);
        return Result.ok({ orderId: order.id, status: OrderStatus.FILLED, filledPricePaise: fillPrice });
      }

      // LIMIT: try immediate fill if crossable, else rest.
      if (quote) {
        const fill = limitFillPricePaise(quote, cmd.side as OrderSide, cmd.limitPricePaise as number);
        if (fill !== null) {
          await this.settleFill(order, fill);
          return Result.ok({ orderId: order.id, status: OrderStatus.FILLED, filledPricePaise: fill });
        }
      }
      return Result.ok({ orderId: order.id, status: OrderStatus.OPEN });
    });
  }

  async cancelOrder(userId: string, orderId: string): Promise<Result<true>> {
    const order = await this.orders.findById(orderId);
    if (!order || String(order.userId) !== userId) return Result.fail(DomainError.of('NOT_FOUND', 'Order not found'));
    return this.locks.withLock(this.accountLock(String(order.challengeId)), 15_000, async () => {
      const fresh = await this.orders.findById(orderId);
      if (!fresh || fresh.status !== OrderStatus.OPEN) {
        return Result.fail(DomainError.of('NOT_CANCELLABLE', 'Only open orders can be cancelled'));
      }
      fresh.status = OrderStatus.CANCELLED;
      await fresh.save();
      return Result.ok(true);
    });
  }

  // ---------------- Tick-driven matching (engine loop) ----------------

  /** Called by the engine on each quote: fill crossable limits + trigger SL/Target for this instrument. */
  async onQuote(quote: Quote): Promise<void> {
    const open = await this.orders.find({ status: OrderStatus.OPEN, instrumentKey: quote.instrumentKey }).lean();
    for (const o of open) {
      await this.locks.withLock(this.accountLock(String(o.challengeId)), 15_000, async () => {
        const order = await this.orders.findById(o._id);
        if (!order || order.status !== OrderStatus.OPEN) return;

        if (order.type === 'LIMIT' && order.limitPricePaise !== undefined) {
          const fill = limitFillPricePaise(quote, order.side as OrderSide, order.limitPricePaise);
          if (fill !== null) await this.settleFill(order, fill);
          return;
        }
        // SL/Target exit orders rest as MARKET-with-trigger; fire when breached.
        if (order.trigger) {
          const px = Math.round(quote.ltp * 100);
          const t = order.trigger;
          const fired =
            (t.kind === 'STOP_LOSS' && order.side === 'SELL' && px <= t.pricePaise) ||
            (t.kind === 'STOP_LOSS' && order.side === 'BUY' && px >= t.pricePaise) ||
            (t.kind === 'TARGET' && order.side === 'SELL' && px >= t.pricePaise) ||
            (t.kind === 'TARGET' && order.side === 'BUY' && px <= t.pricePaise);
          if (fired) {
            const slippageBps = this.appConfig.get('trading.slippage.bps');
            await this.settleFill(order, marketFillPricePaise(quote, order.side as OrderSide, slippageBps));
          }
        }
      });
    }
  }

  // ---------------- Core settlement (must run under the account lock) ----------------

  private async settleFill(order: OrderDocument, fillPricePaise: number): Promise<void> {
    const challengeId = order.challengeId;
    const signedQty = order.side === 'BUY' ? order.qty : -order.qty;

    // Load or init the position for this instrument+product.
    const posDoc = await this.positions.findOne({ challengeId, instrumentKey: order.instrumentKey, product: order.product });
    const prev: PositionState = posDoc
      ? { netQty: posDoc.netQty, avgPricePaise: posDoc.avgPricePaise, realizedPnlPaise: posDoc.realizedPnlPaise }
      : { netQty: 0, avgPricePaise: 0, realizedPnlPaise: 0 };

    const { position, realizedDeltaPaise } = applyFill(prev, signedQty, fillPricePaise);

    const chargeModel = this.appConfig.get('trading.charges.model');
    const chargesPaise = computeChargesPaise(fillPricePaise, order.qty, chargeModel);

    // Persist position.
    await this.positions.updateOne(
      { challengeId, instrumentKey: order.instrumentKey, product: order.product },
      {
        $set: { netQty: position.netQty, avgPricePaise: position.avgPricePaise, realizedPnlPaise: position.realizedPnlPaise },
        $inc: order.side === 'BUY' ? { dayBuyQty: order.qty } : { daySellQty: order.qty },
      },
      { upsert: true },
    );

    // Carry-forward holdings mirror the net CF position for overnight display.
    if (order.product === 'CARRY_FORWARD') {
      await this.holdings.updateOne(
        { challengeId, instrumentKey: order.instrumentKey },
        { $set: { qty: position.netQty, avgPricePaise: position.avgPricePaise } },
        { upsert: true },
      );
    }

    // Trade record.
    await this.trades.create({
      orderId: order._id, challengeId, userId: order.userId, instrumentKey: order.instrumentKey,
      side: order.side, qty: order.qty, pricePaise: fillPricePaise, chargesPaise, realizedPnlPaise: realizedDeltaPaise,
    });

    // Order → FILLED.
    order.status = OrderStatus.FILLED;
    order.filledPricePaise = fillPricePaise;
    order.chargesPaise = chargesPaise;
    order.executedAt = new Date();
    await order.save();

    // Challenge equity: realized P&L in, charges out. Ledger appends (append-only).
    const challenge = await this.challenges.findById(challengeId);
    if (challenge) {
      let balance = challenge.equityPaise;
      if (realizedDeltaPaise !== 0) {
        balance += realizedDeltaPaise;
        await this.ledger.create({
          userId: order.userId, challengeId, type: 'PNL', amountPaise: realizedDeltaPaise,
          balanceAfterPaise: balance, refType: 'TRADE', refId: order._id, note: 'Realized P&L',
        });
        challenge.realizedPnlPaise += realizedDeltaPaise;
      }
      if (chargesPaise !== 0) {
        balance -= chargesPaise;
        await this.ledger.create({
          userId: order.userId, challengeId, type: 'CHARGE', amountPaise: -chargesPaise,
          balanceAfterPaise: balance, refType: 'TRADE', refId: order._id, note: 'Trade charges',
        });
      }
      challenge.equityPaise = balance;
      if (balance > challenge.peakEquityPaise) challenge.peakEquityPaise = balance;

      // Trading-day counting: first fill of a distinct IST date.
      const dateKey = this.calendar.tradingDateKey(new Date());
      if (!challenge.tradingDays.includes(dateKey)) challenge.tradingDays.push(dateKey);

      await challenge.save();

      // Notify the P6 evaluator (equity moved / a fill happened).
      await this.bus.publish('trading.equity.updated', {
        challengeId: String(challengeId), userId: String(order.userId),
        equityPaise: balance, realizedDeltaPaise, dateKey,
      });
    }
  }

  /**
   * Flatten EVERY open position (intraday + carry-forward) at market. Called by
   * the challenge evaluator on FAIL/PASS. MUST be invoked while already holding
   * the account lock (the evaluator holds it), so no re-lock here.
   */
  async forceFlatten(challengeId: string): Promise<void> {
    const cid = new Types.ObjectId(challengeId);
    const challenge = await this.challenges.findById(cid).lean();
    if (!challenge) return;
    const open = await this.positions.find({ challengeId: cid, netQty: { $ne: 0 } }).lean();
    for (const pos of open) {
      const quote = await this.getQuote(pos.instrumentKey);
      if (!quote) continue;
      const side: OrderSide = pos.netQty > 0 ? 'SELL' : 'BUY';
      const order = await this.orders.create({
        userId: challenge.userId, challengeId: cid, instrumentKey: pos.instrumentKey, side,
        type: 'MARKET', product: pos.product, qty: Math.abs(pos.netQty), status: OrderStatus.OPEN, placedAt: new Date(),
      });
      const slippageBps = this.appConfig.get('trading.slippage.bps');
      await this.settleFill(order, marketFillPricePaise(quote, side, slippageBps));
    }
  }

  // ---------------- Square-off (engine scheduler) ----------------

  /** Auto-square-off all INTRADAY positions for a challenge at cutoff (US-TRD-8). */
  async squareOffIntraday(challengeId: string): Promise<void> {
    await this.locks.withLock(this.accountLock(challengeId), 30_000, async () => {
      const cid = new Types.ObjectId(challengeId);
      const openPositions = await this.positions.find({ challengeId: cid, product: 'INTRADAY', netQty: { $ne: 0 } }).lean();
      for (const pos of openPositions) {
        const quote = await this.getQuote(pos.instrumentKey);
        if (!quote) continue;
        const side: OrderSide = pos.netQty > 0 ? 'SELL' : 'BUY';
        const order = await this.orders.create({
          userId: (await this.challenges.findById(cid).lean())!.userId,
          challengeId: cid, instrumentKey: pos.instrumentKey, side, type: 'MARKET', product: 'INTRADAY',
          qty: Math.abs(pos.netQty), status: OrderStatus.OPEN, placedAt: new Date(),
        });
        const slippageBps = this.appConfig.get('trading.slippage.bps');
        await this.settleFill(order, marketFillPricePaise(quote, side, slippageBps));
      }
    });
  }
}
