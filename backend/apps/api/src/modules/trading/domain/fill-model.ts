import { Quote } from '@app/shared';
import { OrderSide } from './order.types';

export interface ChargeModel {
  flatPerOrderPaise: number;
  turnoverBps: number;
}

/**
 * Compute the fill price (paise) for a MARKET order against a live quote,
 * applying slippage. Buys lift the ask, sells hit the bid; slippage widens
 * against the taker. Prices arrive from Quote in rupees; we convert to paise.
 */
export function marketFillPricePaise(quote: Quote, side: OrderSide, slippageBps: number): number {
  const ask = Math.round(quote.ask * 100);
  const bid = Math.round(quote.bid * 100);
  const base = side === 'BUY' ? ask : bid;
  const slip = Math.round((base * slippageBps) / 10_000);
  return side === 'BUY' ? base + slip : Math.max(1, base - slip);
}

/**
 * Whether a resting LIMIT order should fill given the current quote.
 * A buy limit fills when the ask ≤ limit; a sell limit fills when the bid ≥ limit.
 * Returns the fill price (the limit price — price improvement not modeled) or null.
 */
export function limitFillPricePaise(quote: Quote, side: OrderSide, limitPricePaise: number): number | null {
  const ask = Math.round(quote.ask * 100);
  const bid = Math.round(quote.bid * 100);
  if (side === 'BUY' && ask <= limitPricePaise) return limitPricePaise;
  if (side === 'SELL' && bid >= limitPricePaise) return limitPricePaise;
  return null;
}

/** Simulated charges for one executed order (paise), from the config model. */
export function computeChargesPaise(fillPricePaise: number, qty: number, model: ChargeModel): number {
  const turnover = fillPricePaise * qty;
  const turnoverCharge = Math.round((turnover * model.turnoverBps) / 10_000);
  return model.flatPerOrderPaise + turnoverCharge;
}
