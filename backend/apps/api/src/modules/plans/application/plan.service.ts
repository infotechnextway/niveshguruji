import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService, DomainError, Money, Result } from '@app/shared';
import { Plan } from '../infrastructure/schemas/plan.schema';
import { PlanStatus } from '../domain/plan.types';
import { validateChallengeRules } from '../domain/plan-rules.vo';

export interface CreatePlanInput {
  name: string;
  slug: string;
  description?: string;
  priceRupees: number;
  virtualCapitalRupees: number;
  rules: Record<string, unknown>;
  displayOrder?: number;
}

function toPlanView(p: Plan & { _id: unknown }) {
  return {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Money.unsafeFromPaise(p.pricePaise).rupees,
    pricePaise: p.pricePaise,
    virtualCapital: Money.unsafeFromPaise(p.virtualCapitalPaise).rupees,
    virtualCapitalPaise: p.virtualCapitalPaise,
    rules: p.rules,
    status: p.status,
    version: p.version,
    displayOrder: p.displayOrder,
  };
}

@Injectable()
export class PlanService {
  constructor(
    @InjectModel(Plan.name) private readonly plans: Model<Plan>,
    private readonly audit: AuditService,
  ) {}

  /** User-facing catalog: active plans only, ordered. */
  async listPublic() {
    const rows = await this.plans.find({ status: PlanStatus.ACTIVE }).sort({ displayOrder: 1, createdAt: 1 }).lean();
    return rows.map((p) => toPlanView(p as never));
  }

  async listAdmin() {
    const rows = await this.plans.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
    return rows.map((p) => toPlanView(p as never));
  }

  async getById(id: string): Promise<Result<ReturnType<typeof toPlanView>>> {
    const p = await this.plans.findById(id).lean();
    if (!p) return Result.fail(DomainError.of('NOT_FOUND', 'Plan not found'));
    return Result.ok(toPlanView(p as never));
  }

  async create(input: CreatePlanInput, actorId: string, ip?: string): Promise<Result<{ id: string }>> {
    const price = Money.fromRupees(input.priceRupees);
    if (price.isFail) return Result.fail(price.error);
    const capital = Money.fromRupees(input.virtualCapitalRupees);
    if (capital.isFail) return Result.fail(capital.error);
    if (capital.value.paise < 1) return Result.fail(DomainError.of('CAPITAL_INVALID', 'Virtual capital must be positive'));

    const rules = validateChallengeRules(input.rules);
    if (rules.isFail) return Result.fail(rules.error);

    if (await this.plans.exists({ slug: input.slug.toLowerCase() })) {
      return Result.fail(DomainError.of('DUPLICATE', 'A plan with this slug already exists'));
    }

    const plan = await this.plans.create({
      name: input.name,
      slug: input.slug.toLowerCase(),
      description: input.description,
      pricePaise: price.value.paise,
      virtualCapitalPaise: capital.value.paise,
      rules: rules.value,
      status: PlanStatus.ACTIVE,
      version: 1,
      displayOrder: input.displayOrder ?? 0,
    });
    await this.audit.record({
      actorType: 'EMPLOYEE', actorId, action: 'PLAN_CREATED', entity: 'plan', entityId: plan.id,
      after: toPlanView(plan as never), ip,
    });
    return Result.ok({ id: plan.id });
  }

  async update(id: string, input: Partial<CreatePlanInput>, actorId: string, ip?: string): Promise<Result<true>> {
    const plan = await this.plans.findById(id);
    if (!plan) return Result.fail(DomainError.of('NOT_FOUND', 'Plan not found'));
    const before = toPlanView(plan as never);
    let rulesOrPriceChanged = false;

    if (input.name !== undefined) plan.name = input.name;
    if (input.description !== undefined) plan.description = input.description;
    if (input.displayOrder !== undefined) plan.displayOrder = input.displayOrder;

    if (input.priceRupees !== undefined) {
      const price = Money.fromRupees(input.priceRupees);
      if (price.isFail) return Result.fail(price.error);
      plan.pricePaise = price.value.paise;
      rulesOrPriceChanged = true;
    }
    if (input.virtualCapitalRupees !== undefined) {
      const capital = Money.fromRupees(input.virtualCapitalRupees);
      if (capital.isFail) return Result.fail(capital.error);
      plan.virtualCapitalPaise = capital.value.paise;
      rulesOrPriceChanged = true;
    }
    if (input.rules !== undefined) {
      const rules = validateChallengeRules(input.rules);
      if (rules.isFail) return Result.fail(rules.error);
      plan.rules = rules.value as never;
      rulesOrPriceChanged = true;
    }
    // Version bumps only when economics change — existing challenges are unaffected (snapshotted).
    if (rulesOrPriceChanged) plan.version += 1;
    await plan.save();

    await this.audit.record({
      actorType: 'EMPLOYEE', actorId, action: 'PLAN_UPDATED', entity: 'plan', entityId: id,
      before, after: toPlanView(plan as never), ip,
    });
    return Result.ok(true);
  }

  async setStatus(id: string, status: PlanStatus, actorId: string, ip?: string): Promise<Result<true>> {
    const plan = await this.plans.findById(id);
    if (!plan) return Result.fail(DomainError.of('NOT_FOUND', 'Plan not found'));
    const before = plan.status;
    plan.status = status;
    await plan.save();
    await this.audit.record({
      actorType: 'EMPLOYEE', actorId, action: 'PLAN_STATUS_CHANGED', entity: 'plan', entityId: id,
      before: { status: before }, after: { status }, ip,
    });
    return Result.ok(true);
  }
}
