import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import Redis from 'ioredis';
import { Inject } from '@nestjs/common';
import { DomainError, Quote, quoteCacheKey, REDIS_CLIENT, referenceClose, referenceQuote, Result } from '@app/shared';
import { Instrument } from '../infrastructure/schemas/instrument.schema';
import {
  aggregatesFrom1m,
  HistoryCandle,
  intervalBucketMs,
  mapUiInterval,
  UpstoxCandleInterval,
  UpstoxHistoryClient,
} from '../infrastructure/upstox-history.client';
import { Candle1m } from '../infrastructure/schemas/candle.schema';
import {
  catalogBrowseSortStages,
  CATALOG_COUNT_STAGES, CATALOG_DEDUPE_STAGES, CATALOG_PROJECT, traderSegmentMatch,
} from '../infrastructure/catalog-aggregation';
import { traderCatalogMatch } from '../infrastructure/trader-catalog';
import { isUpstoxInstrumentKey, resolveOptionUnderlyingKey } from '../infrastructure/option-underlying';

const SEARCH_PROJECTION = 'instrumentKey symbol name exchange segment lotSize tickSize expiry strike optType underlyingKey';
const UPSTOX_KEY_PREFIX = /^(NSE|BSE)_/;

@Injectable()
export class InstrumentService {
  private readonly logger = new Logger(InstrumentService.name);

  constructor(
    @InjectModel(Instrument.name) private readonly instruments: Model<Instrument>,
    @InjectModel(Candle1m.name) private readonly candleModel: Model<Candle1m>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly history: UpstoxHistoryClient,
  ) {}

  async getByKey(instrumentKey: string) {
    return this.instruments.findOne(traderCatalogMatch({ instrumentKey }))
      .select(SEARCH_PROJECTION).lean();
  }

  async search(
    query: string,
    segment: string | undefined,
    limit = 50,
    _exchange?: string,
  ) {
    const capped = Math.min(Math.max(limit, 1), 100);
    const base = segment ? traderSegmentMatch(segment) : traderCatalogMatch();
    const q = (query || '').trim();

    if (!q) {
      return this.searchAggregated(base, capped);
    }

    const tickerLike = /^[A-Za-z0-9 &.|-]{1,40}$/.test(q) && q.length <= 24;
    const escaped = escapeRegex(q);

    if (tickerLike) {
      const prefixFilter = {
        ...base,
        $or: [
          { symbol: { $regex: `^${escaped}`, $options: 'i' } },
          { name: { $regex: `^${escaped}`, $options: 'i' } },
        ],
      };
      const prefixHits = await this.searchAggregated(prefixFilter, capped);
      if (prefixHits.length >= capped) return prefixHits;

      const seen = new Set(prefixHits.map((r) => r.instrumentKey));
      try {
        const textHits = await this.searchAggregated({ ...base, $text: { $search: q } }, capped);
        for (const hit of textHits) {
          if (seen.has(hit.instrumentKey)) continue;
          prefixHits.push(hit);
          seen.add(hit.instrumentKey);
          if (prefixHits.length >= capped) break;
        }
      } catch {
        // text index may be missing in fresh DBs — prefix results still useful
      }
      return prefixHits;
    }

    try {
      return await this.searchAggregated({ ...base, $text: { $search: q } }, capped);
    } catch {
      return this.searchAggregated({
        ...base,
        $or: [
          { symbol: { $regex: escaped, $options: 'i' } },
          { name: { $regex: escaped, $options: 'i' } },
        ],
      }, capped);
    }
  }

  /** Search with the same dedupe pipeline as segment browse lists. */
  private async searchAggregated(match: Record<string, unknown>, limit: number) {
    return this.catalogAggregate([
      { $match: match },
      ...CATALOG_DEDUPE_STAGES,
      { $sort: { symbol: 1, instrumentKey: 1 } },
      { $limit: limit },
      { $project: CATALOG_PROJECT },
    ]);
  }

  /** Large segment browse may still sort deduped rows — opt in to disk spill when supported. */
  private catalogAggregate<T = Record<string, unknown>>(pipeline: PipelineStage[]): Promise<T[]> {
    return this.instruments.aggregate(pipeline, { allowDiskUse: true }).allowDiskUse(true).exec();
  }

  async listBySegment(segment: string, limit = 100, offset = 0) {
    const capped = Math.min(Math.max(limit, 1), 500);
    const skip = Math.max(offset, 0);
    const rows = await this.catalogAggregate([
      { $match: traderSegmentMatch(segment) },
      ...CATALOG_DEDUPE_STAGES,
      ...catalogBrowseSortStages(segment),
      { $skip: skip },
      { $limit: capped },
      { $project: CATALOG_PROJECT },
    ]);
    return rows;
  }

  async countBySegment(segment: string): Promise<number> {
    const rows = await this.catalogAggregate<{ total: number }>([
      { $match: traderSegmentMatch(segment) },
      ...CATALOG_COUNT_STAGES,
    ]);
    return rows[0]?.total ?? 0;
  }

  /** Batch last-quote lookup — Redis cache, then last stored / historical close. */
  async quotes(instrumentKeys: string[]): Promise<Record<string, Quote | null>> {
    if (!instrumentKeys.length) return {};
    const values = await this.redis.mget(instrumentKeys.map(quoteCacheKey));
    const out: Record<string, Quote | null> = {};
    const missing: string[] = [];
    instrumentKeys.forEach((key, i) => {
      if (values[i]) {
        const parsed = JSON.parse(values[i] as string) as Quote;
        if (isStaleSimulatorQuote(key, parsed)) {
          out[key] = null;
          missing.push(key);
        } else {
          out[key] = parsed;
        }
      } else {
        out[key] = null;
        missing.push(key);
      }
    });
    if (missing.length) {
      const fallbacks = await this.lastCloseQuotes(missing);
      for (const key of missing) {
        if (fallbacks[key]) out[key] = fallbacks[key];
      }
    }
    return out;
  }

  /**
   * Candles for charting: Upstox historical (+ intraday) backfill, optionally
   * upsert 1m into Mongo, merge with any live aggregated bars already stored.
   */
  async candles(
    instrumentKey: string,
    from: number,
    to: number,
    interval = '1minute',
    limit = 5000,
  ): Promise<Result<HistoryCandle[]>> {
    const inst = await this.instruments.findOne({ instrumentKey }).lean();
    if (!inst) return Result.fail(DomainError.of('NOT_FOUND', 'Instrument not found'));

    const historyKey = await this.resolveHistoryKey(instrumentKey, inst);
    const upstoxInterval = mapUiInterval(interval);
    const fetchInterval = aggregatesFrom1m(upstoxInterval) ? '1minute' : upstoxInterval;
    let remote: HistoryCandle[] = [];

    if (this.history.hasToken()) {
      try {
        remote = await this.history.fetchCandles(historyKey, fetchInterval, from, to);
      } catch (err) {
        this.logger.warn(
          `Upstox history failed for ${instrumentKey} (historyKey=${historyKey}): ${(err as Error).message}`,
        );
      }
    }

    if (fetchInterval === '1minute' && remote.length) {
      const ops = remote.map((c) => ({
        updateOne: {
          filter: { instrumentKey, ts: c.t },
          update: { $set: { instrumentKey, ts: c.t, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v } },
          upsert: true,
        },
      }));
      try {
        for (let i = 0; i < ops.length; i += 500) {
          await this.candleModel.bulkWrite(ops.slice(i, i + 500), { ordered: false });
        }
      } catch {
        // non-fatal — still return remote bars
      }
    }

    let merged = remote;
    if (upstoxInterval === '1minute') {
      merged = await this.mergeLocalCandles(instrumentKey, historyKey, from, to, limit, remote);
    } else if (aggregatesFrom1m(upstoxInterval)) {
      const local1m = await this.mergeLocalCandles(instrumentKey, historyKey, from, to, limit * 60, remote);
      merged = aggregateFrom1m(local1m.length ? local1m : remote, upstoxInterval);
    } else if (!merged.length) {
      const local1m = await this.loadLocal1m(instrumentKey, historyKey, from, to, limit);
      merged = aggregateFrom1m(local1m, upstoxInterval);
    }

    if (!merged.length && !this.history.hasToken()) {
      if (upstoxInterval === '1minute') {
        merged = await this.loadLocal1m(instrumentKey, historyKey, from, to, limit);
      } else {
        const local1m = await this.loadLocal1m(instrumentKey, historyKey, from, to, limit * 60);
        merged = aggregateFrom1m(local1m, upstoxInterval);
      }
    }

    if (!merged.length) {
      merged = await this.syntheticCandles(instrumentKey, historyKey, from, to, upstoxInterval, limit);
    }

    return Result.ok(merged.slice(-limit));
  }

  /** Flat bars from reference close, cached quote, or last Mongo close. */
  private async syntheticCandles(
    instrumentKey: string,
    historyKey: string,
    from: number,
    to: number,
    interval: UpstoxCandleInterval,
    limit: number,
  ): Promise<HistoryCandle[]> {
    const keys = instrumentKey === historyKey ? [instrumentKey] : [instrumentKey, historyKey];
    let price: number | null = null;
    for (const key of keys) {
      price = referenceClose(key);
      if (price != null) break;
    }
    if (price == null) {
      for (const key of keys) {
        const cached = await this.redis.get(quoteCacheKey(key));
        if (cached) {
          price = (JSON.parse(cached) as Quote).ltp;
          break;
        }
      }
    }
    if (price == null) {
      const mongoLast = await this.candleModel.findOne({ instrumentKey: { $in: keys } })
        .sort({ ts: -1 }).select('c').lean();
      if (mongoLast) price = mongoLast.c;
    }
    if (price == null) return [];
    return buildFlatCandles(price, from, to, interval, limit);
  }

  /** Option chain around ATM for an underlying + expiry (index options at launch). */
  async optionChain(
    underlyingKey: string,
    expiry: string | undefined,
    atmSpan = 20,
  ): Promise<Result<Record<string, unknown>>> {
    const underlying = await this.instruments.findOne({ instrumentKey: underlyingKey }).lean();
    if (!underlying) return Result.fail(DomainError.of('NOT_FOUND', 'Underlying not found'));

    const foUnderlyingKey = await this.resolveFoUnderlyingKey(underlyingKey, underlying);

    const expiryFilter: Record<string, unknown> = {
      underlyingKey: foUnderlyingKey, optType: { $in: ['CE', 'PE'] }, exchange: 'NSE', enabled: true,
    };
    if (expiry) expiryFilter.expiry = expiry;
    else {
      const nearest = await this.instruments.find({
        underlyingKey: foUnderlyingKey, optType: { $exists: true }, exchange: 'NSE', enabled: true,
      }).sort({ expiry: 1 }).select('expiry').limit(1).lean();
      if (nearest[0]?.expiry) expiryFilter.expiry = nearest[0].expiry;
    }

    const options = await this.instruments.find(expiryFilter).sort({ strike: 1 }).lean();
    const spotLtp = await this.spotLtp(underlyingKey, foUnderlyingKey);

    const strikeMap = new Map<number, { strike: number; ce?: unknown; pe?: unknown }>();
    const quoteKeys = options.map((o) => o.instrumentKey);
    const quotes = await this.quotes(quoteKeys);
    for (const opt of options) {
      const s = opt.strike ?? 0;
      if (!strikeMap.has(s)) strikeMap.set(s, { strike: s });
      const entry = strikeMap.get(s)!;
      const leg = { instrumentKey: opt.instrumentKey, symbol: opt.symbol, ltp: quotes[opt.instrumentKey]?.ltp ?? null };
      if (opt.optType === 'CE') entry.ce = leg;
      else entry.pe = leg;
    }

    let strikes = [...strikeMap.values()].sort((a, b) => a.strike - b.strike);
    if (atmSpan > 0 && spotLtp != null && strikes.length > atmSpan * 2 + 1) {
      let atmIdx = 0;
      let best = Infinity;
      strikes.forEach((s, i) => {
        const d = Math.abs(s.strike - spotLtp);
        if (d < best) { best = d; atmIdx = i; }
      });
      const from = Math.max(0, atmIdx - atmSpan);
      const to = Math.min(strikes.length, atmIdx + atmSpan + 1);
      strikes = strikes.slice(from, to);
    }

    return Result.ok({
      underlying: underlyingKey,
      expiry: expiryFilter.expiry ?? null,
      spot: spotLtp,
      strikes,
    });
  }

  async expiries(underlyingKey: string): Promise<string[]> {
    const inst = await this.instruments.findOne({ instrumentKey: underlyingKey }).lean();
    if (!inst) return [];
    const foUnderlyingKey = await this.resolveFoUnderlyingKey(underlyingKey, inst);
    const rows = await this.instruments.distinct('expiry', {
      underlyingKey: foUnderlyingKey, optType: { $exists: true }, exchange: 'NSE', enabled: true,
    });
    return (rows as string[]).filter(Boolean).sort();
  }

  /**
   * Map trader catalog keys (often DHAN|…) to the Upstox underlyingKey stored on FO rows.
   */
  private async resolveFoUnderlyingKey(
    inputKey: string,
    inst: { symbol: string; name?: string; exchange: string; segment: string; underlyingKey?: string },
  ): Promise<string> {
    let foKey = resolveOptionUnderlyingKey(inputKey, inst);
    if (foKey !== inputKey) return foKey;

    if (inst.segment === 'EQ' && !isUpstoxInstrumentKey(inputKey)) {
      const eq = await this.instruments.findOne({
        enabled: true, exchange: 'NSE', segment: 'EQ', symbol: inst.symbol,
        instrumentKey: { $regex: /^NSE_EQ\|/ },
      }).select('instrumentKey').lean();
      if (eq) return eq.instrumentKey;
    }

    if (inst.segment === 'INDEX' && !isUpstoxInstrumentKey(inputKey)) {
      const idx = await this.instruments.findOne({
        enabled: true, exchange: 'NSE', segment: 'INDEX', symbol: inst.symbol,
        instrumentKey: { $regex: /^NSE_INDEX\|/ },
      }).select('instrumentKey').lean();
      if (idx) return idx.instrumentKey;
    }

    return foKey;
  }

  /** Spot LTP for chain ATM band — prefer live quote on the selected key, then FO underlying. */
  private async spotLtp(...keys: string[]): Promise<number | null> {
    const seen = new Set<string>();
    for (const key of keys) {
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const spot = await this.redis.get(quoteCacheKey(key));
      if (spot) return (JSON.parse(spot) as Quote).ltp;
    }
    return null;
  }

  /** Map DHAN| keys to an Upstox instrument_key for historical candle REST. */
  private async resolveHistoryKey(
    instrumentKey: string,
    inst?: { symbol: string; exchange: string; segment: string } | null,
  ): Promise<string> {
    if (!instrumentKey.startsWith('DHAN|')) return instrumentKey;
    const row = inst ?? await this.instruments.findOne({ instrumentKey }).lean();
    if (!row) return instrumentKey;
    const match = await this.instruments.findOne({
      enabled: true,
      symbol: row.symbol,
      exchange: row.exchange,
      segment: row.segment,
      instrumentKey: { $regex: UPSTOX_KEY_PREFIX },
    }).select('instrumentKey').lean();
    return match?.instrumentKey ?? instrumentKey;
  }

  private async mergeLocalCandles(
    instrumentKey: string,
    historyKey: string,
    from: number,
    to: number,
    limit: number,
    remote: HistoryCandle[],
  ): Promise<HistoryCandle[]> {
    const local = await this.loadLocal1m(instrumentKey, historyKey, from, to, limit);
    const map = new Map<number, HistoryCandle>();
    for (const c of remote) map.set(c.t, c);
    for (const c of local) map.set(c.t, c);
    return [...map.values()].sort((a, b) => a.t - b.t);
  }

  private async loadLocal1m(
    instrumentKey: string,
    historyKey: string,
    from: number,
    to: number,
    limit: number,
  ): Promise<HistoryCandle[]> {
    const keys = instrumentKey === historyKey ? [instrumentKey] : [instrumentKey, historyKey];
    const rows = await this.candleModel.find({
      instrumentKey: { $in: keys },
      ts: { $gte: from, $lte: to },
    }).sort({ ts: 1 }).limit(limit).lean();
    return rows.map((c) => ({ t: c.ts, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v }));
  }

  /** Last known close for instruments with no live tick in Redis. */
  private async lastCloseQuotes(keys: string[]): Promise<Record<string, Quote>> {
    const out: Record<string, Quote> = {};
    await Promise.all(keys.map(async (key) => {
      const inst = await this.instruments.findOne({ instrumentKey: key }).lean();
      const historyKey = await this.resolveHistoryKey(key, inst);
      const lookupKeys = historyKey === key ? [key] : [key, historyKey];

      let lastBar: { ts: number; o: number; h: number; l: number; c: number; v: number } | null = null;
      const mongoLast = await this.candleModel.findOne({ instrumentKey: { $in: lookupKeys } })
        .sort({ ts: -1 }).lean();
      if (mongoLast) {
        lastBar = { ts: mongoLast.ts, o: mongoLast.o, h: mongoLast.h, l: mongoLast.l, c: mongoLast.c, v: mongoLast.v };
      }

      if (!lastBar && this.history.hasToken()) {
        try {
          const to = Date.now();
          const from = to - 7 * 86400_000;
          const bars = await this.history.fetchCandles(historyKey, 'day', from, to);
          const bar = bars[bars.length - 1];
          if (bar) {
            lastBar = { ts: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, v: bar.v };
          }
        } catch {
          // ignore — no history available
        }
      }

      if (!lastBar) {
        const ref = referenceClose(key);
        if (ref != null) {
          const q = referenceQuote(key, ref);
          if (q) out[key] = q;
        }
        return;
      }
      const prev = await this.candleModel.findOne({
        instrumentKey: { $in: lookupKeys },
        ts: { $lt: lastBar.ts },
      }).sort({ ts: -1 }).lean();

      const prevClose = prev?.c ?? lastBar.c;
      const change = +(lastBar.c - prevClose).toFixed(2);
      out[key] = {
        instrumentKey: key,
        ltp: lastBar.c,
        prevClose,
        change,
        changePct: prevClose ? +((change / prevClose) * 100).toFixed(2) : 0,
        bid: lastBar.c,
        ask: lastBar.c,
        volume: lastBar.v ?? 0,
        ts: lastBar.ts,
      };
    }));
    return out;
  }
}

function aggregateFrom1m(bars: HistoryCandle[], interval: UpstoxCandleInterval): HistoryCandle[] {
  if (interval === '1minute' || !bars.length) return bars;
  const bucketMs = intervalBucketMs(interval);
  const buckets = new Map<number, HistoryCandle>();
  for (const b of bars) {
    const bucket = interval === 'day'
      ? istDayStartMs(b.t)
      : b.t - (b.t % bucketMs);
    const cur = buckets.get(bucket);
    if (!cur) {
      buckets.set(bucket, { t: bucket, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v });
    } else {
      cur.h = Math.max(cur.h, b.h);
      cur.l = Math.min(cur.l, b.l);
      cur.c = b.c;
      cur.v += b.v;
    }
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t);
}

function istDayStartMs(tsMs: number): number {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = tsMs + istOffsetMs;
  return Math.floor(ist / 86_400_000) * 86_400_000 - istOffsetMs;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Reject legacy simulator ticks that cached ~100–3000 for major indices. */
function isStaleSimulatorQuote(key: string, q: Quote): boolean {
  const ref = referenceClose(key);
  if (ref == null) return false;
  return q.ltp < ref * 0.4 || q.ltp > ref * 1.6;
}

function buildFlatCandles(
  price: number,
  from: number,
  to: number,
  interval: UpstoxCandleInterval,
  limit: number,
): HistoryCandle[] {
  const bucketMs = intervalBucketMs(interval);
  const start = interval === 'day' ? istDayStartMs(from) : from - (from % bucketMs);
  const out: HistoryCandle[] = [];
  for (let t = start; t <= to && out.length < limit; t += bucketMs) {
    out.push({ t, o: price, h: price, l: price, c: price, v: 0 });
  }
  return out;
}
