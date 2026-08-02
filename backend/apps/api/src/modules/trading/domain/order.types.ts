export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type ProductType = 'INTRADAY' | 'CARRY_FORWARD';

export enum OrderStatus {
  OPEN = 'OPEN', // resting limit order awaiting fill
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

/** Only ONE of SL or Target may be attached at placement (C-5, US-TRD-4). */
export type TriggerKind = 'STOP_LOSS' | 'TARGET';

export interface OrderTrigger {
  kind: TriggerKind;
  /** Trigger price in paise. */
  pricePaise: number;
}

export interface PlaceOrderCommand {
  challengeId: string;
  userId: string;
  instrumentKey: string;
  side: OrderSide;
  type: OrderType;
  product: ProductType;
  qty: number;
  limitPricePaise?: number; // required for LIMIT
  trigger?: OrderTrigger; // optional, mutually exclusive kinds
}
