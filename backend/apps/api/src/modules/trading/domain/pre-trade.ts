import { DomainError, Quantity, Result } from '@app/shared';
import { PlaceOrderCommand, ProductType } from './order.types';

export interface InstrumentInfo {
  instrumentKey: string;
  segment: string; // EQ | FO | CUR | INDEX
  lotSize: number;
  freezeQty?: number;
  enabled: boolean;
}

export interface ChallengeInfo {
  status: string; // must be ACTIVE/PENDING to trade
  segments: string[]; // allowed by the plan snapshot
  equityPaise: number;
}

export interface PreTradeContext {
  command: PlaceOrderCommand;
  instrument: InstrumentInfo;
  challenge: ChallengeInfo;
  marketOpen: boolean;
  /** Estimated cost of the order in paise (for buy margin check). */
  estimatedCostPaise: number;
}

const TRADABLE_CHALLENGE_STATES = ['PENDING', 'ACTIVE'];

/**
 * Fail-fast pre-trade checks (US-TRD-7), in the SRS order. Pure so the exact
 * rejection reason is deterministic and unit-tested.
 */
export function validatePreTrade(ctx: PreTradeContext): Result<true> {
  const { command, instrument, challenge, marketOpen } = ctx;

  if (!TRADABLE_CHALLENGE_STATES.includes(challenge.status)) {
    return Result.fail(DomainError.of('CHALLENGE_NOT_TRADABLE', `Challenge is ${challenge.status}`));
  }
  if (!marketOpen) {
    return Result.fail(DomainError.of('MARKET_CLOSED', 'Market is closed for this segment'));
  }
  if (!instrument.enabled) {
    return Result.fail(DomainError.of('INSTRUMENT_DISABLED', 'Instrument is not available for trading'));
  }
  if (!challenge.segments.includes(instrument.segment)) {
    return Result.fail(
      DomainError.of('SEGMENT_NOT_ALLOWED', `Your plan does not permit trading ${instrument.segment}`, { segment: instrument.segment }),
    );
  }

  const qty = Quantity.ofLots(command.qty, instrument.lotSize);
  if (qty.isFail) return Result.fail(qty.error);
  if (instrument.freezeQty && command.qty > instrument.freezeQty) {
    return Result.fail(DomainError.of('FREEZE_QTY_EXCEEDED', `Quantity exceeds the freeze limit of ${instrument.freezeQty}`));
  }

  if (command.type === 'LIMIT' && (command.limitPricePaise === undefined || command.limitPricePaise <= 0)) {
    return Result.fail(DomainError.of('LIMIT_PRICE_REQUIRED', 'A positive limit price is required for LIMIT orders'));
  }

  // SL/Target mutual exclusivity is enforced by the single trigger field, but
  // guard the price sanity here too.
  if (command.trigger && command.trigger.pricePaise <= 0) {
    return Result.fail(DomainError.of('TRIGGER_PRICE_INVALID', 'Trigger price must be positive'));
  }

  // Buy-side capital sufficiency (shorts are margin-simplified in the simulator:
  // require equity ≥ estimated notional for both sides to keep drawdown honest).
  if (ctx.estimatedCostPaise > challenge.equityPaise) {
    return Result.fail(
      DomainError.of('INSUFFICIENT_CAPITAL', 'Order value exceeds available equity', {
        requiredPaise: ctx.estimatedCostPaise, availablePaise: challenge.equityPaise,
      }),
    );
  }

  return Result.ok(true);
}
