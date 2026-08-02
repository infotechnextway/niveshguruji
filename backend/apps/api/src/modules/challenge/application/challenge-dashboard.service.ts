import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Redis from 'ioredis';
import { Quote, quoteCacheKey, REDIS_CLIENT } from '@app/shared';
import { InstrumentService } from '../../market/application/instrument.service';
import { Challenge } from '../../plans/infrastructure/schemas/challenge.schema';
import { Position } from '../../trading/infrastructure/schemas/position.schema';
import { Reward } from '../infrastructure/schemas/reward.schema';
import { unrealizedPnl } from '../../trading/domain/position-math';

/** Read model for the trader's challenge dashboard (US-CHG-1). */
@Injectable()
export class ChallengeDashboardService {
  constructor(
    @InjectModel(Challenge.name) private readonly challenges: Model<Challenge>,
    @InjectModel(Position.name) private readonly positions: Model<Position>,
    @InjectModel(Reward.name) private readonly rewards: Model<Reward>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly instrumentQuotes: InstrumentService,
  ) {}

  async forUser(userId: string) {
    const challenge = await this.challenges.findOne({
      userId: new Types.ObjectId(userId),
      status: { $in: ['PENDING', 'ACTIVE', 'PASSED_PENDING_REVIEW', 'PASSED'] },
    }).sort({ startedAt: -1 }).lean();
    if (!challenge) return { challenge: null };
    return { challenge: await this.progress(challenge) };
  }

  async byId(userId: string, challengeId: string) {
    const challenge = await this.challenges.findOne({ _id: new Types.ObjectId(challengeId), userId: new Types.ObjectId(userId) }).lean();
    if (!challenge) return { challenge: null };
    return { challenge: await this.progress(challenge) };
  }

  async history(userId: string) {
    return this.challenges.find({ userId: new Types.ObjectId(userId) })
      .sort({ startedAt: -1 })
      .select('planName status virtualCapitalPaise equityPaise realizedPnlPaise startedAt endsAt')
      .lean();
  }

  private async progress(challenge: any) {
    const cid = challenge._id as Types.ObjectId;
    // MTM equity.
    const openPositions = await this.positions.find({ challengeId: cid, netQty: { $ne: 0 } }).lean();
    let unrealized = 0;
    for (const p of openPositions) {
      const mark = await this.markPricePaise(p.instrumentKey);
      if (mark === null) continue;
      unrealized += unrealizedPnl({ netQty: p.netQty, avgPricePaise: p.avgPricePaise, realizedPnlPaise: 0 }, mark);
    }
    const mtmEquity = challenge.equityPaise + unrealized;
    const cap = challenge.virtualCapitalPaise;
    const r = challenge.rules;

    const profitTarget = cap + Math.round((cap * r.profitTargetPct) / 100);
    const maxFloor = cap - Math.round((cap * r.maxDrawdownPct) / 100);
    const dailyFloor = challenge.dayStartEquityPaise - Math.round((challenge.dayStartEquityPaise * r.dailyDrawdownPct) / 100);

    const reward = ['PASSED_PENDING_REVIEW', 'PASSED'].includes(challenge.status)
      ? await this.rewards.findOne({ challengeId: cid }).select('status computedAmountPaise overrideAmountPaise').lean()
      : null;

    return {
      id: String(cid),
      planName: challenge.planName,
      status: challenge.status,
      rules: r,
      virtualCapitalPaise: cap,
      equityPaise: challenge.equityPaise,
      mtmEquityPaise: mtmEquity,
      unrealizedPnlPaise: unrealized,
      realizedPnlPaise: challenge.realizedPnlPaise,
      profit: {
        targetPaise: profitTarget,
        currentPaise: mtmEquity,
        progressPct: Math.max(0, Math.min(100, Math.round(((mtmEquity - cap) / (profitTarget - cap)) * 100))),
      },
      maxDrawdown: {
        floorPaise: maxFloor,
        usedPct: Math.max(0, Math.min(100, Math.round(((cap - mtmEquity) / (cap - maxFloor)) * 100))),
      },
      dailyDrawdown: {
        floorPaise: dailyFloor,
        usedPct: Math.max(0, Math.min(100, Math.round(((challenge.dayStartEquityPaise - mtmEquity) / (challenge.dayStartEquityPaise - dailyFloor)) * 100))),
      },
      tradingDays: { completed: challenge.tradingDays.length, required: r.minTradingDays },
      startedAt: challenge.startedAt,
      endsAt: challenge.endsAt,
      daysRemaining: Math.max(0, Math.ceil((new Date(challenge.endsAt).getTime() - Date.now()) / 86_400_000)),
      reward,
    };
  }

  private async markPricePaise(instrumentKey: string): Promise<number | null> {
    const cached = await this.redis.get(quoteCacheKey(instrumentKey));
    if (cached) return Math.round((JSON.parse(cached) as Quote).ltp * 100);
    const map = await this.instrumentQuotes.quotes([instrumentKey]);
    const q = map[instrumentKey];
    return q ? Math.round(q.ltp * 100) : null;
  }
}
