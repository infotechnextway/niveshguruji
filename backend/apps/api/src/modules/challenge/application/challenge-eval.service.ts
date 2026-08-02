import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Redis from 'ioredis';
import {
  AppConfigService, EVENT_BUS, EventBus, Quote, quoteCacheKey, RedisLockService, REDIS_CLIENT,
} from '@app/shared';
import { Challenge } from '../../plans/infrastructure/schemas/challenge.schema';
import { Position } from '../../trading/infrastructure/schemas/position.schema';
import { Order } from '../../trading/infrastructure/schemas/order.schema';
import { Reward, RewardStatus } from '../infrastructure/schemas/reward.schema';
import { ExecutionService } from '../../trading/application/execution.service';
import { ChallengeStatus } from '../../plans/domain/plan.types';
import { computeRewardPaise, evaluateChallenge, EvalOutcome } from '../domain/challenge-rules-eval';
import { unrealizedPnl } from '../../trading/domain/position-math';

/**
 * Real-time challenge evaluator. Runs in the engine. Shares the per-account
 * lock with the VEE so a fill and its rule check never interleave. Triggered by
 * `trading.equity.updated` (fill happened) and by a periodic MTM sweep (open
 * positions moving against the trader can breach drawdown without a new fill).
 */
@Injectable()
export class ChallengeEvalService {
  private readonly logger = new Logger(ChallengeEvalService.name);

  constructor(
    @InjectModel(Challenge.name) private readonly challenges: Model<Challenge>,
    @InjectModel(Position.name) private readonly positions: Model<Position>,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(Reward.name) private readonly rewards: Model<Reward>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
    private readonly locks: RedisLockService,
    private readonly execution: ExecutionService,
    private readonly appConfig: AppConfigService,
  ) {}

  private accountLock(challengeId: string): string {
    return `lock:account:${challengeId}`;
  }

  /** Mark-to-market equity = realized equity + unrealized P&L across open positions. */
  private async mtmEquity(challengeId: Types.ObjectId, realizedEquityPaise: number): Promise<number> {
    const openPositions = await this.positions.find({ challengeId, netQty: { $ne: 0 } }).lean();
    let unrealized = 0;
    for (const p of openPositions) {
      const cached = await this.redis.get(quoteCacheKey(p.instrumentKey));
      if (!cached) continue;
      const mark = Math.round((JSON.parse(cached) as Quote).ltp * 100);
      unrealized += unrealizedPnl({ netQty: p.netQty, avgPricePaise: p.avgPricePaise, realizedPnlPaise: 0 }, mark);
    }
    return realizedEquityPaise + unrealized;
  }

  /** Evaluate one challenge under the account lock; apply terminal side effects. */
  async evaluate(challengeId: string): Promise<EvalOutcome | null> {
    return this.locks.withLock(this.accountLock(challengeId), 20_000, async () => {
      const cid = new Types.ObjectId(challengeId);
      const challenge = await this.challenges.findById(cid);
      if (!challenge) return null;
      if (![ChallengeStatus.PENDING, ChallengeStatus.ACTIVE].includes(challenge.status)) return null;

      // First evaluation promotes PENDING → ACTIVE.
      if (challenge.status === ChallengeStatus.PENDING) {
        challenge.status = ChallengeStatus.ACTIVE;
        challenge.events.push({ at: new Date(), type: 'ACTIVATED' });
        await challenge.save();
      }

      const mtm = await this.mtmEquity(cid, challenge.equityPaise);
      const outcome = evaluateChallenge({
        rules: challenge.rules,
        virtualCapitalPaise: challenge.virtualCapitalPaise,
        mtmEquityPaise: mtm,
        dayStartEquityPaise: challenge.dayStartEquityPaise,
        tradingDaysCount: challenge.tradingDays.length,
        expired: challenge.endsAt.getTime() <= Date.now(),
      });

      if (outcome.decision === 'CONTINUE') return outcome;

      if (outcome.decision === 'FAIL') {
        await this.fail(challenge, outcome.reason, mtm);
      } else {
        await this.pass(challenge, mtm);
      }
      return outcome;
    });
  }

  private async fail(challenge: any, reason: string, mtmEquityPaise: number): Promise<void> {
    // Square off everything and cancel resting orders (already lock-held: call
    // the raw settlement via ExecutionService.squareOffIntraday for intraday,
    // and flatten CF positions too by cancelling and closing).
    await this.execution.forceFlatten(String(challenge._id));
    await this.orders.updateMany({ challengeId: challenge._id, status: 'OPEN' }, { $set: { status: 'CANCELLED', rejectionReason: 'CHALLENGE_FAILED' } });

    challenge.status = ChallengeStatus.FAILED;
    challenge.events.push({ at: new Date(), type: 'FAILED', note: reason });
    await challenge.save();
    await this.bus.publish('challenge.failed', { challengeId: String(challenge._id), userId: String(challenge.userId), reason });
    this.logger.log(`Challenge ${String(challenge._id)} FAILED (${reason})`);
  }

  private async pass(challenge: any, finalEquityPaise: number): Promise<void> {
    const freeze = this.appConfig.get('challenge.freezeOnPass');
    if (freeze) {
      await this.execution.forceFlatten(String(challenge._id));
      await this.orders.updateMany({ challengeId: challenge._id, status: 'OPEN' }, { $set: { status: 'CANCELLED', rejectionReason: 'CHALLENGE_PASSED' } });
    }
    challenge.status = ChallengeStatus.PASSED_PENDING_REVIEW;
    challenge.events.push({ at: new Date(), type: 'PASSED_PENDING_REVIEW' });
    await challenge.save();

    // Create the reward record in ELIGIBLE for admin review.
    const computed = computeRewardPaise(challenge.virtualCapitalPaise, finalEquityPaise, challenge.rules.rewardPct);
    await this.rewards.updateOne(
      { challengeId: challenge._id },
      {
        $setOnInsert: {
          challengeId: challenge._id, userId: challenge.userId, rewardPct: challenge.rules.rewardPct,
          computedAmountPaise: computed, status: RewardStatus.ELIGIBLE,
          timeline: [{ at: new Date(), event: 'ELIGIBLE', note: 'Challenge passed' }],
        },
      },
      { upsert: true },
    );
    await this.bus.publish('challenge.passed', { challengeId: String(challenge._id), userId: String(challenge.userId), computedRewardPaise: computed });
    this.logger.log(`Challenge ${String(challenge._id)} PASSED — reward ${computed} paise pending review`);
  }
}
