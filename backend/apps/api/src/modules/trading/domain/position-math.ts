import { Money } from '@app/shared';

/**
 * Position accounting via weighted-average cost. Positions are signed: netQty > 0
 * long, < 0 short. Pure functions — the single source of truth for how a fill
 * changes a position and what realized P&L it produces. Exhaustively tested.
 */
export interface PositionState {
  netQty: number;
  avgPricePaise: number; // weighted-average cost of the open quantity
  realizedPnlPaise: number;
}

export interface FillResult {
  position: PositionState;
  /** Realized P&L produced BY THIS FILL (paise), already added into position.realizedPnlPaise. */
  realizedDeltaPaise: number;
}

export const FLAT: PositionState = { netQty: 0, avgPricePaise: 0, realizedPnlPaise: 0 };

/**
 * Apply a fill to a position. `signedQty` is +qty for a buy, -qty for a sell.
 * Handles: opening, adding to, reducing, closing, and flipping a position.
 */
export function applyFill(pos: PositionState, signedQty: number, fillPricePaise: number): FillResult {
  const oldQty = pos.netQty;
  const sameDirection = oldQty === 0 || Math.sign(oldQty) === Math.sign(signedQty);

  if (sameDirection) {
    // Opening or increasing — new weighted-average cost.
    const newQty = oldQty + signedQty;
    const oldNotional = Money.unsafeFromPaise(pos.avgPricePaise).times(Math.abs(oldQty));
    const addNotional = Money.unsafeFromPaise(fillPricePaise).times(Math.abs(signedQty));
    const avg = Math.round(oldNotional.add(addNotional).paise / Math.abs(newQty));
    return {
      position: { netQty: newQty, avgPricePaise: avg, realizedPnlPaise: pos.realizedPnlPaise },
      realizedDeltaPaise: 0,
    };
  }

  // Opposite direction — reduce/close/flip; realize P&L on the closed quantity.
  const closingQty = Math.min(Math.abs(signedQty), Math.abs(oldQty));
  // Realized per unit: long closes gain when sell > avg; short closes gain when buy < avg.
  const direction = Math.sign(oldQty); // +1 long, -1 short
  const perUnit = (fillPricePaise - pos.avgPricePaise) * direction;
  const realizedDelta = perUnit * closingQty;
  const realized = pos.realizedPnlPaise + realizedDelta;

  const remainingIncoming = Math.abs(signedQty) - closingQty;
  if (remainingIncoming === 0) {
    // Pure reduce or exact close.
    const newQty = oldQty + signedQty;
    return {
      position: { netQty: newQty, avgPricePaise: newQty === 0 ? 0 : pos.avgPricePaise, realizedPnlPaise: realized },
      realizedDeltaPaise: realizedDelta,
    };
  }

  // Flip: the leftover opens a new position on the other side at the fill price.
  const newQty = Math.sign(signedQty) * remainingIncoming;
  return {
    position: { netQty: newQty, avgPricePaise: fillPricePaise, realizedPnlPaise: realized },
    realizedDeltaPaise: realizedDelta,
  };
}

/** Unrealized P&L (paise) of an open position at the given mark price. */
export function unrealizedPnl(pos: PositionState, markPricePaise: number): number {
  if (pos.netQty === 0) return 0;
  return (markPricePaise - pos.avgPricePaise) * pos.netQty;
}
