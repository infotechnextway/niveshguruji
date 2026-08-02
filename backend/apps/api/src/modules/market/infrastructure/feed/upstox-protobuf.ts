import protobuf from 'protobufjs';
import { Quote } from '@app/shared';

/**
 * Official Upstox Market Data Feed V3 proto (inlined so Nest build does not
 * need asset copy for .proto files).
 * Source: https://assets.upstox.com/feed/market-data-feed/v3/MarketDataFeed.proto
 */
const PROTO = `
syntax = "proto3";
package com.upstox.marketdatafeederv3udapi.rpc.proto;

message LTPC {
  double ltp = 1;
  int64 ltt = 2;
  int64 ltq = 3;
  double cp = 4;
}

message MarketLevel {
  repeated Quote bidAskQuote = 1;
}

message MarketOHLC {
  repeated OHLC ohlc = 1;
}

message Quote {
  int64 bidQ = 1;
  double bidP = 2;
  int64 askQ = 3;
  double askP = 4;
}

message OptionGreeks {
  double delta = 1;
  double theta = 2;
  double gamma = 3;
  double vega = 4;
  double rho = 5;
}

message OHLC {
  string interval = 1;
  double open = 2;
  double high = 3;
  double low = 4;
  double close = 5;
  int64 vol = 6;
  int64 ts = 7;
}

enum Type {
  initial_feed = 0;
  live_feed = 1;
  market_info = 2;
}

message MarketFullFeed {
  LTPC ltpc = 1;
  MarketLevel marketLevel = 2;
  OptionGreeks optionGreeks = 3;
  MarketOHLC marketOHLC = 4;
  double atp = 5;
  int64 vtt = 6;
  double oi = 7;
  double iv = 8;
  double tbq = 9;
  double tsq = 10;
}

message IndexFullFeed {
  LTPC ltpc = 1;
  MarketOHLC marketOHLC = 2;
}

message FullFeed {
  oneof FullFeedUnion {
    MarketFullFeed marketFF = 1;
    IndexFullFeed indexFF = 2;
  }
}

message FirstLevelWithGreeks {
  LTPC ltpc = 1;
  Quote firstDepth = 2;
  OptionGreeks optionGreeks = 3;
  int64 vtt = 4;
  double oi = 5;
  double iv = 6;
}

message Feed {
  oneof FeedUnion {
    LTPC ltpc = 1;
    FullFeed fullFeed = 2;
    FirstLevelWithGreeks firstLevelWithGreeks = 3;
  }
  RequestMode requestMode = 4;
}

enum RequestMode {
  ltpc = 0;
  full_d5 = 1;
  option_greeks = 2;
  full_d30 = 3;
}

enum MarketStatus {
  PRE_OPEN_START = 0;
  PRE_OPEN_END = 1;
  NORMAL_OPEN = 2;
  NORMAL_CLOSE = 3;
  CLOSING_START = 4;
  CLOSING_END = 5;
}

message MarketInfo {
  map<string, MarketStatus> segmentStatus = 1;
}

message FeedResponse {
  Type type = 1;
  map<string, Feed> feeds = 2;
  int64 currentTs = 3;
  MarketInfo marketInfo = 4;
}
`;

type LtpcLike = { ltp?: number; cp?: number; ltt?: number };
type QuoteDepth = { bidP?: number; askP?: number };
type FeedLike = {
  ltpc?: LtpcLike;
  fullFeed?: {
    marketFF?: { ltpc?: LtpcLike; marketLevel?: { bidAskQuote?: QuoteDepth[] }; vtt?: number | string };
    indexFF?: { ltpc?: LtpcLike };
  };
  firstLevelWithGreeks?: { ltpc?: LtpcLike; firstDepth?: QuoteDepth; vtt?: number | string };
};

let FeedResponseType: protobuf.Type | null = null;

function getFeedResponseType(): protobuf.Type {
  if (FeedResponseType) return FeedResponseType;
  const parsed = protobuf.parse(PROTO);
  FeedResponseType = parsed.root.lookupType('com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse');
  return FeedResponseType;
}

export async function warmUpstoxProto(): Promise<void> {
  getFeedResponseType();
}

/**
 * Decode an Upstox v3 market-data frame (protobuf preferred; JSON fallback)
 * into shared Quote objects.
 */
export async function decodeUpstoxFeedMessage(data: Buffer): Promise<Quote[]> {
  try {
    const asText = data.toString('utf8');
    if (asText.startsWith('{')) {
      const parsed = JSON.parse(asText) as { feeds?: Record<string, FeedLike> };
      if (parsed.feeds) return normalizeFeeds(parsed.feeds);
    }
  } catch {
    // binary protobuf
  }

  try {
    const type = getFeedResponseType();
    const message = type.decode(data);
    const obj = type.toObject(message, {
      longs: Number,
      enums: String,
      bytes: String,
      defaults: false,
    }) as { feeds?: Record<string, FeedLike>; currentTs?: number };
    if (!obj.feeds) return [];
    return normalizeFeeds(obj.feeds, obj.currentTs);
  } catch {
    return [];
  }
}

/** Pure normalizer used by unit tests with fixture objects. */
export function normalizeFeeds(
  feeds: Record<string, FeedLike>,
  currentTs?: number,
): Quote[] {
  const out: Quote[] = [];
  const now = currentTs && currentTs > 1e12 ? currentTs : Date.now();

  for (const [key, feed] of Object.entries(feeds)) {
    const ltpc =
      feed.ltpc
      ?? feed.fullFeed?.marketFF?.ltpc
      ?? feed.fullFeed?.indexFF?.ltpc
      ?? feed.firstLevelWithGreeks?.ltpc;
    if (ltpc?.ltp === undefined) continue;

    const ltp = Number(ltpc.ltp);
    const prevClose = Number(ltpc.cp ?? ltp);
    const change = +(ltp - prevClose).toFixed(2);
    const depth =
      feed.fullFeed?.marketFF?.marketLevel?.bidAskQuote?.[0]
      ?? feed.firstLevelWithGreeks?.firstDepth;
    const volume = Number(
      feed.fullFeed?.marketFF?.vtt
      ?? feed.firstLevelWithGreeks?.vtt
      ?? 0,
    );

    out.push({
      instrumentKey: key,
      ltp,
      change,
      changePct: prevClose ? +((change / prevClose) * 100).toFixed(2) : 0,
      bid: Number(depth?.bidP ?? ltp),
      ask: Number(depth?.askP ?? ltp),
      volume,
      prevClose,
      ts: Number(ltpc.ltt && ltpc.ltt > 1e12 ? ltpc.ltt : now),
    });
  }
  return out;
}
