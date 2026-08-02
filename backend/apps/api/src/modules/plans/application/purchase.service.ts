import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { AppConfigService, AuditService, DomainError, EVENT_BUS, EventBus, RedisLockService, Result } from '@app/shared';
import { Plan } from '../infrastructure/schemas/plan.schema';
import { Payment } from '../infrastructure/schemas/payment.schema';
import { Subscription } from '../infrastructure/schemas/subscription.schema';
import { Challenge } from '../infrastructure/schemas/challenge.schema';
import { LedgerEntry } from '../infrastructure/schemas/ledger-entry.schema';
import { User } from '../../auth/infrastructure/schemas/user.schema';
import { KycStatus } from '../../auth/domain/auth.types';
import {
  ChallengeStatus, PaymentStatus, PlanStatus, SubscriptionStatus,
} from '../domain/plan.types';
import { PAYMENT_PROVIDER, PaymentProvider } from '../infrastructure/payment/payment.port';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    @InjectModel(Plan.name) private readonly plans: Model<Plan>,
    @InjectModel(Payment.name) private readonly payments: Model<Payment>,
    @InjectModel(Subscription.name) private readonly subscriptions: Model<Subscription>,
    @InjectModel(Challenge.name) private readonly challenges: Model<Challenge>,
    @InjectModel(LedgerEntry.name) private readonly ledger: Model<LedgerEntry>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @Inject(PAYMENT_PROVIDER) private readonly gateway: PaymentProvider,
    private readonly locks: RedisLockService,
    private readonly appConfig: AppConfigService,
    private readonly audit: AuditService,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
  ) {}

  /** Step 1: create a purchase intent + gateway order (US-PLAN-2). */
  async createOrder(userId: string, planId: string): Promise<Result<{
    paymentId: string; gatewayOrderId: string; amountPaise: number; currency: string; publicKey: string;
  }>> {
    const user = await this.users.findById(userId).lean();
    if (!user) return Result.fail(DomainError.of('NOT_FOUND', 'User not found'));
    if (user.kycStatus !== KycStatus.APPROVED) {
      return Result.fail(DomainError.of('KYC_REQUIRED', 'Complete KYC verification before purchasing a plan'));
    }

    const plan = await this.plans.findById(planId).lean();
    if (!plan || plan.status !== PlanStatus.ACTIVE) {
      return Result.fail(DomainError.of('PLAN_UNAVAILABLE', 'Plan is not available for purchase'));
    }

    if (!this.appConfig.get('plan.allowMultipleActiveChallenges')) {
      const active = await this.challenges.exists({
        userId: new Types.ObjectId(userId),
        status: { $in: [ChallengeStatus.PENDING, ChallengeStatus.ACTIVE] },
      });
      if (active) {
        return Result.fail(DomainError.of('ACTIVE_CHALLENGE_EXISTS', 'You already have an active challenge'));
      }
    }

    const receipt = `rcpt_${userId.slice(-6)}_${Date.now()}`;
    const order = await this.gateway.createOrder(plan.pricePaise, 'INR', receipt);

    const payment = await this.payments.create({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
      amountPaise: plan.pricePaise,
      currency: 'INR',
      status: PaymentStatus.CREATED,
      provider: this.gateway.name,
      gatewayOrderId: order.gatewayOrderId,
      idempotencyKey: `act_${order.gatewayOrderId}`,
    });

    return Result.ok({
      paymentId: payment.id,
      gatewayOrderId: order.gatewayOrderId,
      amountPaise: order.amountPaise,
      currency: order.currency,
      publicKey: order.publicKey,
    });
  }

  /** Step 2a: checkout callback from the client SDK — verify signature then activate. */
  async confirmCheckout(orderId: string, paymentId: string, signature: string): Promise<Result<{ challengeId: string }>> {
    if (!this.gateway.verifyCheckoutSignature(orderId, paymentId, signature)) {
      return Result.fail(DomainError.of('SIGNATURE_INVALID', 'Payment verification failed'));
    }
    return this.activate(orderId, paymentId, { source: 'checkout' });
  }

  /** Step 2b: server-to-server webhook — verified by the controller, funnels to the same activate(). */
  async handleWebhookPaymentCaptured(orderId: string, gatewayPaymentId: string, meta: Record<string, unknown>): Promise<void> {
    const res = await this.activate(orderId, gatewayPaymentId, { source: 'webhook', meta });
    if (res.isFail && res.error.code !== 'ALREADY_ACTIVATED') {
      this.logger.warn(`Webhook activation for ${orderId} returned ${res.error.code}`);
    }
  }

  /**
   * Idempotent activation — the single crediting path. Guarded by a per-order
   * Redis lock AND the unique idempotencyKey/subscription so concurrent
   * checkout+webhook+poller credit virtual capital EXACTLY once.
   */
  private async activate(
    orderId: string,
    gatewayPaymentId: string,
    ctx: { source: string; meta?: Record<string, unknown> },
  ): Promise<Result<{ challengeId: string }>> {
    return this.locks.withLock(`lock:activate:${orderId}`, 15_000, async () => {
      const payment = await this.payments.findOne({ gatewayOrderId: orderId });
      if (!payment) return Result.fail(DomainError.of('NOT_FOUND', 'Payment not found'));

      if (payment.status === PaymentStatus.ACTIVATED) {
        return Result.ok({ challengeId: String(payment.challengeId) }); // idempotent success
      }
      if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.FAILED) {
        return Result.fail(DomainError.of('PAYMENT_TERMINAL', `Payment already ${payment.status}`));
      }

      const plan = await this.plans.findById(payment.planId).lean();
      if (!plan) return Result.fail(DomainError.of('NOT_FOUND', 'Plan not found'));

      const now = new Date();
      const endsAt = new Date(now.getTime() + plan.rules.expiryDays * 24 * 60 * 60 * 1000);

      // Create challenge (PENDING — P6 evaluator promotes to ACTIVE), snapshotting rules.
      const challenge = await this.challenges.create({
        userId: payment.userId,
        planId: payment.planId,
        planVersion: plan.version,
        planName: plan.name,
        rules: plan.rules,
        virtualCapitalPaise: plan.virtualCapitalPaise,
        equityPaise: plan.virtualCapitalPaise,
        peakEquityPaise: plan.virtualCapitalPaise,
        dayStartEquityPaise: plan.virtualCapitalPaise,
        status: ChallengeStatus.PENDING,
        startedAt: now,
        endsAt,
        events: [{ at: now, type: 'CREATED', note: `activated via ${ctx.source}` }],
      });

      const subscription = await this.subscriptions.create({
        userId: payment.userId,
        planId: payment.planId,
        challengeId: challenge._id,
        paymentId: payment._id,
        status: SubscriptionStatus.ACTIVE,
        activatedAt: now,
        expiresAt: endsAt,
      });

      // Opening ledger CREDIT of virtual capital (append-only).
      await this.ledger.create({
        userId: payment.userId,
        challengeId: challenge._id,
        type: 'CREDIT',
        amountPaise: plan.virtualCapitalPaise,
        balanceAfterPaise: plan.virtualCapitalPaise,
        refType: 'PAYMENT',
        refId: payment._id,
        note: 'Virtual capital credited on plan activation',
      });

      payment.status = PaymentStatus.ACTIVATED;
      payment.gatewayPaymentId = gatewayPaymentId;
      payment.subscriptionId = subscription._id;
      payment.challengeId = challenge._id;
      if (ctx.meta) payment.lastWebhookMeta = ctx.meta;
      await payment.save();

      await this.audit.record({
        actorType: 'SYSTEM', actorId: 'payments', action: 'PLAN_ACTIVATED', entity: 'payment', entityId: payment.id,
        after: { challengeId: String(challenge._id), subscriptionId: String(subscription._id), source: ctx.source },
      });
      await this.bus.publish('billing.plan.activated', {
        userId: String(payment.userId), challengeId: String(challenge._id), planId: String(payment.planId),
      });

      return Result.ok({ challengeId: String(challenge._id) });
    });
  }

  // ---------- User queries ----------

  async myPayments(userId: string) {
    return this.payments.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 })
      .select('planId amountPaise status provider createdAt').lean();
  }

  async mySubscription(userId: string) {
    const sub = await this.subscriptions.findOne({ userId: new Types.ObjectId(userId), status: SubscriptionStatus.ACTIVE })
      .sort({ activatedAt: -1 }).lean();
    if (!sub) return { active: null };
    const challenge = await this.challenges.findById(sub.challengeId)
      .select('planName rules virtualCapitalPaise status startedAt endsAt').lean();
    return { active: { subscription: sub, challenge } };
  }

  // ---------- Finance ----------

  async listPayments(status: PaymentStatus | undefined, page: number, pageSize: number) {
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.payments.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      this.payments.countDocuments(filter),
    ]);
    return { items, total, page, pageSize };
  }

  async refund(paymentId: string, reason: string, actorId: string, ip?: string): Promise<Result<{ gatewayRefundId: string }>> {
    return this.locks.withLock(`lock:refund:${paymentId}`, 15_000, async () => {
      const payment = await this.payments.findById(paymentId);
      if (!payment) return Result.fail(DomainError.of('NOT_FOUND', 'Payment not found'));
      if (payment.status !== PaymentStatus.ACTIVATED && payment.status !== PaymentStatus.CAPTURED) {
        return Result.fail(DomainError.of('NOT_REFUNDABLE', `Cannot refund a ${payment.status} payment`));
      }
      if (!payment.gatewayPaymentId) {
        return Result.fail(DomainError.of('NO_GATEWAY_PAYMENT', 'No captured gateway payment to refund'));
      }

      const result = await this.gateway.refund(payment.gatewayPaymentId, payment.amountPaise);

      payment.status = PaymentStatus.REFUNDED;
      payment.gatewayRefundId = result.gatewayRefundId;
      payment.refundReason = reason;
      await payment.save();

      // Cancel the subscription and the challenge it funded.
      if (payment.subscriptionId) {
        await this.subscriptions.updateOne({ _id: payment.subscriptionId }, { $set: { status: SubscriptionStatus.CANCELLED } });
      }
      if (payment.challengeId) {
        await this.challenges.updateOne(
          { _id: payment.challengeId, status: { $in: [ChallengeStatus.PENDING, ChallengeStatus.ACTIVE] } },
          { $set: { status: ChallengeStatus.EXPIRED }, $push: { events: { at: new Date(), type: 'CANCELLED', note: 'refund' } } },
        );
      }
      await this.audit.record({
        actorType: 'EMPLOYEE', actorId, action: 'PAYMENT_REFUNDED', entity: 'payment', entityId: payment.id,
        after: { gatewayRefundId: result.gatewayRefundId, reason }, ip,
      });
      return Result.ok(result);
    });
  }
}
