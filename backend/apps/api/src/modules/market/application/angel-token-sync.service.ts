import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { fetchMaster } from '../infrastructure/fetch-master';
import { Instrument } from '../infrastructure/schemas/instrument.schema';

const MASTER_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';
const BATCH = 1000;

export interface AngelInstrumentRow {
  token?: string;
  symbol?: string;
  name?: string;
  exch_seg?: string;
  instrumenttype?: string;
}

export interface AngelTokenSyncResult {
  downloaded: number;
  matched: number;
  updated: number;
  unmatchedAngel: number;
  skippedSegment: number;
}

/** Map Angel exch_seg to Smart Stream exchangeType. */
export function mapAngelExchangeType(exchSeg: string, instrumentType?: string): number | null {
  const seg = exchSeg.toUpperCase();
  const type = (instrumentType || '').toUpperCase();
  if (seg === 'NSE') {
    if (type === 'AMXIDX' || type === 'INDEX') return 1;
    return 1; // NSE_CM
  }
  if (seg === 'NFO') return 2;
  if (seg === 'BSE') return 3;
  if (seg === 'BFO') return 4;
  if (seg === 'MCX') return 5;
  return null;
}

const ALLOWED_SEGMENTS = new Set(['NSE', 'NFO']);

/**
 * Downloads Angel OpenAPIScripMaster.json and maps tokens onto existing
 * instruments by trading symbol + exchange/segment heuristics.
 */
@Injectable()
export class AngelTokenSyncService {
  private readonly logger = new Logger(AngelTokenSyncService.name);

  constructor(
    @InjectModel(Instrument.name) private readonly instruments: Model<Instrument>,
  ) {}

  async syncTokens(fetchImpl: typeof fetch = fetch): Promise<AngelTokenSyncResult> {
    this.logger.log(`Downloading Angel instrument master from ${MASTER_URL}`);
    const res = await fetchMaster(
      MASTER_URL,
      { headers: { Accept: 'application/json' } },
      'Angel instrument master',
      fetchImpl,
    );
    if (!res.ok) {
      throw new Error(`Angel instrument master download failed (${res.status}) — check network access to margincalculator.angelbroking.com`);
    }

    const rows = (await res.json()) as AngelInstrumentRow[];
    if (!Array.isArray(rows)) throw new Error('Angel instrument master is not a JSON array');

    const existing = await this.instruments.find({ enabled: true })
      .select('instrumentKey symbol exchange segment')
      .lean();
    const bySymbol = new Map<string, typeof existing>();
    for (const inst of existing) {
      const key = inst.symbol.toUpperCase();
      const list = bySymbol.get(key) ?? [];
      list.push(inst);
      bySymbol.set(key, list);
    }

    let matched = 0;
    let updated = 0;
    let unmatchedAngel = 0;
    let skippedSegment = 0;
    const ops: Parameters<Model<Instrument>['bulkWrite']>[0] = [];

    for (const row of rows) {
      const token = row.token?.trim();
      const symbol = row.symbol?.trim();
      const exchSeg = row.exch_seg?.trim();
      if (!token || !symbol || !exchSeg) continue;

      if (!ALLOWED_SEGMENTS.has(exchSeg.toUpperCase())) {
        skippedSegment++;
        continue;
      }

      const exchangeType = mapAngelExchangeType(exchSeg, row.instrumenttype);
      if (exchangeType === null) {
        skippedSegment++;
        continue;
      }

      const candidates = bySymbol.get(symbol.toUpperCase());
      if (!candidates?.length) {
        unmatchedAngel++;
        continue;
      }

      const inst = this.pickBestMatch(candidates, exchSeg, row.instrumenttype);
      if (!inst) {
        unmatchedAngel++;
        continue;
      }

      matched++;
      ops.push({
        updateOne: {
          filter: { instrumentKey: inst.instrumentKey },
          update: { $set: { angelToken: token, angelExchangeType: exchangeType } },
        },
      });

      if (ops.length >= BATCH) {
        const result = await this.instruments.bulkWrite(ops, { ordered: false });
        updated += result.modifiedCount ?? 0;
        ops.length = 0;
      }
    }

    if (ops.length) {
      const result = await this.instruments.bulkWrite(ops, { ordered: false });
      updated += result.modifiedCount ?? 0;
    }

    this.logger.log(
      `Angel token sync done: downloaded=${rows.length} matched=${matched} updated=${updated}`,
    );
    return { downloaded: rows.length, matched, updated, unmatchedAngel, skippedSegment };
  }

  private pickBestMatch(
    candidates: Array<{ instrumentKey: string; symbol: string; exchange: string; segment: string }>,
    exchSeg: string,
    instrumentType?: string,
  ) {
    const seg = exchSeg.toUpperCase();
    const type = (instrumentType || '').toUpperCase();

    const wantExchange = 'NSE';
    let wantSegment: string | null = null;
    if (seg === 'NSE') {
      wantSegment = type.includes('IDX') || type === 'AMXIDX' ? 'INDEX' : 'EQ';
    } else if (seg === 'NFO') {
      wantSegment = 'FO';
    }

    const filtered = candidates.filter((c) => c.exchange === wantExchange);
    const pool = filtered.length ? filtered : candidates;

    if (wantSegment) {
      const segMatch = pool.filter((c) => c.segment === wantSegment);
      if (segMatch.length === 1) return segMatch[0];
      if (segMatch.length > 1) return segMatch[0];
    }

    return pool.length === 1 ? pool[0] : pool[0];
  }
}
