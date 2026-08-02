import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService, DomainError, Result } from '@app/shared';
import { Reward, RewardStatus } from '../infrastructure/schemas/reward.schema';
import { Challenge } from '../../plans/infrastructure/schemas/challenge.schema';
import { ChallengeStatus } from '../../plans/domain/plan.types';

@Injectable()
export class RewardAdminService {
  constructor(
    @InjectModel(Reward.name) private readonly rewards: Model<Reward>,
    @InjectModel(Challenge.name) private readonly challenges: Model<Challenge>,
    private readonly audit: AuditService,
  ) {}

  async queue(status: RewardStatus | undefined, page: number, pageSize: number) {
    const filter = status ? { status } : { status: RewardStatus.ELIGIBLE };
    const [items, total] = await Promise.all([
      this.rewards.find(filter).sort({ createdAt: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      this.rewards.countDocuments(filter),
    ]);
    const challengeIds = items.map((r) => r.challengeId);
    const challenges = await this.challenges.find({ _id: { $in: challengeIds } })
      .select('planName virtualCapitalPaise equityPaise realizedPnlPaise tradingDays').lean();
    const byId = new Map(challenges.map((c) => [String(c._id), c]));
    return { items: items.map((r) => ({ ...r, challenge: byId.get(String(r.challengeId)) ?? null })), total, page, pageSize };
  }

  async detail(rewardId: string): Promise<Result<Record<string, unknown>>> {
    const reward = await this.rewards.findById(rewardId).lean();
    if (!reward) return Result.fail(DomainError.of('NOT_FOUND', 'Reward not found'));
    const challenge = await this.challenges.findById(reward.challengeId).lean();
    return Result.ok({ ...reward, challenge });
  }

  async approve(rewardId: string, overrideAmountPaise: number | undefined, reason: string | undefined, actorId: string, ip?: string): Promise<Result<true>> {
    return this.transition(rewardId, RewardStatus.APPROVED, 'REWARD_APPROVED', reason, actorId, ip, (reward) => {
      if (overrideAmountPaise !== undefined) reward.overrideAmountPaise = overrideAmountPaise;
      reward.status = RewardStatus.APPROVED;
    }, [RewardStatus.ELIGIBLE]);
  }

  async reject(rewardId: string, reason: string, actorId: string, ip?: string): Promise<Result<true>> {
    return this.transition(rewardId, RewardStatus.REJECTED, 'REWARD_REJECTED', reason, actorId, ip, (reward) => {
      reward.status = RewardStatus.REJECTED;
    }, [RewardStatus.ELIGIBLE, RewardStatus.APPROVED]);
  }

  async markPaid(rewardId: string, reason: string | undefined, actorId: string, ip?: string): Promise<Result<true>> {
    return this.transition(rewardId, RewardStatus.PAID, 'REWARD_PAID', reason, actorId, ip, (reward) => {
      reward.status = RewardStatus.PAID;
    }, [RewardStatus.APPROVED]);
  }

  private async transition(
    rewardId: string,
    to: RewardStatus,
    action: string,
    reason: string | undefined,
    actorId: string,
    ip: string | undefined,
    mutate: (reward: any) => void,
    allowedFrom: RewardStatus[],
  ): Promise<Result<true>> {
    const reward = await this.rewards.findById(rewardId);
    if (!reward) return Result.fail(DomainError.of('NOT_FOUND', 'Reward not found'));
    if (!allowedFrom.includes(reward.status)) {
      return Result.fail(DomainError.of('REWARD_INVALID_TRANSITION', `Cannot move a ${reward.status} reward to ${to}`));
    }
    const before = reward.status;
    mutate(reward);
    reward.reviewerId = new Types.ObjectId(actorId);
    reward.decisionReason = reason;
    reward.timeline.push({ at: new Date(), event: to, byEmployeeId: actorId, note: reason });
    await reward.save();

    // Finalize the challenge status once the reward is approved (PASSED) or rejected.
    if (to === RewardStatus.APPROVED) {
      await this.challenges.updateOne({ _id: reward.challengeId, status: ChallengeStatus.PASSED_PENDING_REVIEW }, { $set: { status: ChallengeStatus.PASSED } });
    }
    await this.audit.record({
      actorType: 'EMPLOYEE', actorId, action, entity: 'reward', entityId: rewardId,
      before: { status: before }, after: { status: to, overrideAmountPaise: reward.overrideAmountPaise, reason }, ip,
    });
    return Result.ok(true);
  }

  async myReward(userId: string, challengeId: string) {
    return this.rewards.findOne({ userId: new Types.ObjectId(userId), challengeId: new Types.ObjectId(challengeId) })
      .select('status computedAmountPaise overrideAmountPaise rewardPct').lean();
  }
}
