import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EVENT_BUS, EventBus } from '@app/shared';
import { Challenge } from '../../plans/infrastructure/schemas/challenge.schema';
import { ChallengeEvalService } from './challenge-eval.service';

/**
 * Engine-side driver. Two triggers:
 *  1. `trading.equity.updated` — evaluate immediately after any fill.
 *  2. periodic MTM sweep (every 5s) — open positions moving against the trader
 *     can breach drawdown with no new fill, so we re-evaluate active challenges.
 */
@Injectable()
export class ChallengeEvalDriver implements OnModuleInit {
  private readonly logger = new Logger(ChallengeEvalDriver.name);

  constructor(
    @InjectModel(Challenge.name) private readonly challenges: Model<Challenge>,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
    private readonly evaluator: ChallengeEvalService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bus.subscribe<{ challengeId: string }>('trading.equity.updated', (event) => {
      void this.evaluator.evaluate(event.payload.challengeId).catch((e) => this.logger.error(e.message));
    });
    const sweep = setInterval(() => void this.sweep(), 5_000);
    sweep.unref();
    this.logger.log('Challenge evaluator driver started');
  }

  private async sweep(): Promise<void> {
    const active = await this.challenges.find({ status: { $in: ['PENDING', 'ACTIVE'] } }).select('_id').lean();
    for (const c of active) {
      await this.evaluator.evaluate(String(c._id)).catch((e) => this.logger.error(e.message));
    }
  }
}
