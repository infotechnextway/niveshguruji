export interface Quote {
  instrumentKey: string; ltp: number; change: number; changePct: number;
  bid: number; ask: number; volume: number; prevClose: number; ts: number;
}
export interface Instrument {
  instrumentKey: string; symbol: string; name: string; exchange: string; segment: string; lotSize: number;
  tickSize?: number; underlyingKey?: string; expiry?: string; strike?: number; optType?: string;
}
export type Side = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type Product = 'INTRADAY' | 'CARRY_FORWARD';
export type TriggerKind = 'STOP_LOSS' | 'TARGET';
export interface ChallengeProgress {
  id: string; planName: string; status: string;
  virtualCapitalPaise: number; equityPaise: number; mtmEquityPaise: number;
  unrealizedPnlPaise: number; realizedPnlPaise: number;
  profit: { targetPaise: number; currentPaise: number; progressPct: number };
  maxDrawdown: { floorPaise: number; usedPct: number };
  dailyDrawdown: { floorPaise: number; usedPct: number };
  tradingDays: { completed: number; required: number };
  daysRemaining: number;
}
