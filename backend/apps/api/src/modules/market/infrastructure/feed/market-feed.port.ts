import { Quote } from '@app/shared';

export const MARKET_FEED = Symbol('MARKET_FEED');

export type TickHandler = (quote: Quote) => void;

/**
 * Abstraction over the upstream market-data source. The engine holds ONE
 * instance and subscribes once per instrument (ADR-7). Adapters:
 *  - UpstoxFeed (production, WSS)
 *  - SimulatorFeed (dev/test/replay — drives the VEE deterministically in P5)
 */
export interface MarketFeed {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  subscribe(instrumentKeys: string[]): Promise<void>;
  unsubscribe(instrumentKeys: string[]): Promise<void>;
  onTick(handler: TickHandler): void;
  /** Seconds since the last received tick, or null if none yet. */
  secondsSinceLastTick(): number | null;
}
