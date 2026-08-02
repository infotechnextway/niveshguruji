/**
 * Domain events — the contract every module uses to communicate across the
 * api/engine process boundary (ADR-2: Redis Pub/Sub bus).
 */
export interface DomainEvent<TPayload = unknown> {
  /** Namespaced event name, e.g. "trading.order.filled". */
  readonly name: string;
  /** ISO timestamp set at publish time. */
  readonly occurredAt: string;
  /** Unique id for idempotent consumption. */
  readonly eventId: string;
  readonly payload: TPayload;
}

export type EventHandler<TPayload = unknown> = (event: DomainEvent<TPayload>) => Promise<void> | void;

export interface EventBus {
  publish<TPayload>(name: string, payload: TPayload): Promise<void>;
  subscribe<TPayload>(name: string, handler: EventHandler<TPayload>): Promise<void>;
}

export const EVENT_BUS = Symbol('EVENT_BUS');
