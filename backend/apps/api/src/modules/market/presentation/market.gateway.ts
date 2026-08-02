import { Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import Redis from 'ioredis';
import { IncomingMessage } from 'http';
import {
  EVENT_BUS, EventBus, Quote, quoteCacheKey, quoteChannel, REDIS_CLIENT,
} from '@app/shared';
import { TokenService } from '../../auth/infrastructure/token.service';
import { MarketDataService } from '../application/market-data.service';

interface ClientState {
  userId: string;
  subscriptions: Set<string>;
}

/**
 * Client-facing WebSocket gateway (ADR-7 room-per-instrument fan-out). Lives in
 * the engine; Nginx routes /ws here. Auth via JWT on the connection query.
 * On subscribe, the client immediately receives the cached last quote, then
 * live ticks. First client in a room bumps MarketDataService interest (upstream
 * subscribe); last client leaving drops it.
 */
@WebSocketGateway({ path: '/ws' })
export class MarketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MarketGateway.name);
  @WebSocketServer() server!: Server;

  private readonly clients = new Map<WebSocket, ClientState>();
  /** instrumentKey -> set of sockets watching it. */
  private readonly rooms = new Map<string, Set<WebSocket>>();
  /** instrumentKeys we've already subscribed to on the bus. */
  private readonly busSubscribed = new Set<string>();

  constructor(
    private readonly tokens: TokenService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
    private readonly marketData: MarketDataService,
  ) {}

  afterInit(): void {
    this.logger.log('Market WebSocket gateway initialized on /ws');
  }

  handleConnection(client: WebSocket, req: IncomingMessage): void {
    try {
      const url = new URL(req.url ?? '', 'ws://localhost');
      const token = url.searchParams.get('token');
      if (!token) throw new Error('missing token');
      const claims = this.tokens.verifyAccess(token);
      this.clients.set(client, { userId: claims.sub, subscriptions: new Set() });
      client.on('message', (raw) => void this.onMessage(client, raw.toString()));
      client.send(JSON.stringify({ type: 'connected' }));
    } catch {
      client.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
      client.close();
    }
  }

  handleDisconnect(client: WebSocket): void {
    const state = this.clients.get(client);
    if (state) {
      for (const key of state.subscriptions) this.leaveRoom(client, key);
      this.clients.delete(client);
    }
  }

  private async onMessage(client: WebSocket, raw: string): Promise<void> {
    const state = this.clients.get(client);
    if (!state) return;
    let msg: { action?: string; instrumentKeys?: string[] };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const keys = (msg.instrumentKeys ?? []).slice(0, 200);
    if (msg.action === 'subscribe') {
      for (const key of keys) await this.joinRoom(client, state, key);
    } else if (msg.action === 'unsubscribe') {
      for (const key of keys) {
        this.leaveRoom(client, key);
        state.subscriptions.delete(key);
      }
    }
  }

  private async joinRoom(client: WebSocket, state: ClientState, key: string): Promise<void> {
    if (state.subscriptions.has(key)) return;
    state.subscriptions.add(key);
    let room = this.rooms.get(key);
    const isFirst = !room || room.size === 0;
    if (!room) {
      room = new Set();
      this.rooms.set(key, room);
    }
    room.add(client);

    if (isFirst) {
      await this.marketData.addInterest([key]);
    }

    if (!this.busSubscribed.has(key)) {
      this.busSubscribed.add(key);
      await this.bus.subscribe<Quote>(quoteChannel(key), (event) => this.relay(key, event.payload));
    }

    const cached = await this.redis.get(quoteCacheKey(key));
    if (cached) client.send(JSON.stringify({ type: 'quote', data: JSON.parse(cached) }));
  }

  private leaveRoom(client: WebSocket, key: string): void {
    const room = this.rooms.get(key);
    if (!room) return;
    room.delete(client);
    if (room.size === 0) {
      this.rooms.delete(key);
      void this.marketData.removeInterest([key]);
    }
  }

  private relay(key: string, quote: Quote): void {
    const room = this.rooms.get(key);
    if (!room?.size) return;
    const frame = JSON.stringify({ type: 'quote', data: quote });
    for (const socket of room) {
      if (socket.readyState === socket.OPEN) socket.send(frame);
    }
  }
}
