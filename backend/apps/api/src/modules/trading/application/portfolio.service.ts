import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Redis from 'ioredis';
import { Quote, quoteCacheKey, REDIS_CLIENT } from '@app/shared';
import { InstrumentService } from '../../market/application/instrument.service';
import { Order } from '../infrastructure/schemas/order.schema';
import { Position } from '../infrastructure/schemas/position.schema';
import { Holding } from '../infrastructure/schemas/holding.schema';
import { Trade } from '../infrastructure/schemas/trade.schema';
import { Challenge } from '../../plans/infrastructure/schemas/challenge.schema';
import { unrealizedPnl } from '../domain/position-math';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(Position.name) private readonly positions: Model<Position>,
    @InjectModel(Holding.name) private readonly holdings: Model<Holding>,
    @InjectModel(Trade.name) private readonly trades: Model<Trade>,
    @InjectModel(Challenge.name) private readonly challenges: Model<Challenge>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly instrumentQuotes: InstrumentService,
  ) {}

  private async markPrice(instrumentKey: string): Promise<number | null> {
    const cached = await this.redis.get(quoteCacheKey(instrumentKey));
    if (cached) return Math.round((JSON.parse(cached) as Quote).ltp * 100);
    const map = await this.instrumentQuotes.quotes([instrumentKey]);
    const q = map[instrumentKey];
    return q ? Math.round(q.ltp * 100) : null;
  }

  async orderBook(challengeId: string) {
    const cid = new Types.ObjectId(challengeId);
    const [open, executed] = await Promise.all([
      this.orders.find({ challengeId: cid, status: 'OPEN' }).sort({ placedAt: -1 }).lean(),
      this.orders.find({ challengeId: cid, status: { $in: ['FILLED', 'CANCELLED', 'REJECTED'] } }).sort({ placedAt: -1 }).limit(200).lean(),
    ]);
    return { open, executed };
  }

  /** Positions with live MTM + unrealized P&L (US-PF-1/3). */
  async positionsView(challengeId: string) {
    const cid = new Types.ObjectId(challengeId);
    const rows = await this.positions.find({ challengeId: cid, netQty: { $ne: 0 } }).lean();
    let totalUnrealized = 0;
    const items = [];
    for (const p of rows) {
      const mark = await this.markPrice(p.instrumentKey);
      const uPnl = mark !== null ? unrealizedPnl({ netQty: p.netQty, avgPricePaise: p.avgPricePaise, realizedPnlPaise: 0 }, mark) : 0;
      totalUnrealized += uPnl;
      items.push({
        instrumentKey: p.instrumentKey, product: p.product, netQty: p.netQty,
        avgPricePaise: p.avgPricePaise, markPricePaise: mark, unrealizedPnlPaise: uPnl,
        realizedPnlPaise: p.realizedPnlPaise,
      });
    }
    const challenge = await this.challenges.findById(cid).lean();
    return {
      positions: items,
      totalUnrealizedPaise: totalUnrealized,
      equityPaise: challenge?.equityPaise ?? 0,
      realizedPnlPaise: challenge?.realizedPnlPaise ?? 0,
      mtmEquityPaise: (challenge?.equityPaise ?? 0) + totalUnrealized,
    };
  }

  async holdingsView(challengeId: string) {
    const cid = new Types.ObjectId(challengeId);
    const rows = await this.holdings.find({ challengeId: cid, qty: { $ne: 0 } }).lean();
    const items = [];
    for (const h of rows) {
      const mark = await this.markPrice(h.instrumentKey);
      const invested = h.avgPricePaise * h.qty;
      const current = mark !== null ? mark * h.qty : invested;
      items.push({
        instrumentKey: h.instrumentKey, qty: h.qty, avgPricePaise: h.avgPricePaise,
        markPricePaise: mark, investedPaise: invested, currentValuePaise: current,
        pnlPaise: current - invested,
      });
    }
    return items;
  }

  async recentTrades(challengeId: string, limit = 100) {
    return this.trades.find({ challengeId: new Types.ObjectId(challengeId) }).sort({ at: -1 }).limit(limit).lean();
  }
}
