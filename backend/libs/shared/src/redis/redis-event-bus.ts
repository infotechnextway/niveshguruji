import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { DomainEvent, EventBus, EventHandler } from '../kernel/domain-event';
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from './redis.constants';

const CHANNEL_PREFIX = 'events:';

/**
 * Redis Pub/Sub implementation of the EventBus (ADR-2).
 * Fire-and-forget semantics; consumers that need durability (e.g. reward
 * review queues) persist state transitions in Mongo — the bus is a signal,
 * not the source of truth.
 */
@Injectable()
export class RedisEventBus implements EventBus {
  private readonly logger = new Logger(RedisEventBus.name);
  private readonly handlers = new Map<string, EventHandler[]>();
  private listening = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly publisher: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly subscriber: Redis,
  ) {}

  async publish<TPayload>(name: string, payload: TPayload): Promise<void> {
    const event: DomainEvent<TPayload> = {
      name,
      payload,
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
    };
    await this.publisher.publish(CHANNEL_PREFIX + name, JSON.stringify(event));
  }

  async subscribe<TPayload>(name: string, handler: EventHandler<TPayload>): Promise<void> {
    const existing = this.handlers.get(name) ?? [];
    existing.push(handler as EventHandler);
    this.handlers.set(name, existing);
    await this.subscriber.subscribe(CHANNEL_PREFIX + name);

    if (!this.listening) {
      this.listening = true;
      this.subscriber.on('message', (channel, message) => {
        if (!channel.startsWith(CHANNEL_PREFIX)) return;
        const eventName = channel.slice(CHANNEL_PREFIX.length);
        const registered = this.handlers.get(eventName);
        if (!registered?.length) return;
        let event: DomainEvent;
        try {
          event = JSON.parse(message) as DomainEvent;
        } catch {
          this.logger.error(`Malformed event on ${channel}`);
          return;
        }
        for (const h of registered) {
          Promise.resolve(h(event)).catch((err) =>
            this.logger.error(`Handler for ${eventName} failed: ${err.message}`),
          );
        }
      });
    }
  }
}
