import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { fetchMaster } from '../infrastructure/fetch-master';
import {
  DHAN_MASTER_URL,
  dhanCsvColumnIndex,
  mapDhanExchangeSegment,
  parseCsvLine,
} from '../infrastructure/dhan-csv.util';
import { Instrument } from '../infrastructure/schemas/instrument.schema';
import { isBseDhanSegment } from '../infrastructure/trader-catalog';

const BATCH = 1000;

export interface DhanTokenSyncResult {
  downloaded: number;
  matched: number;
  updated: number;
  unmatchedDhan: number;
  skippedSegment: number;
}

/** Map Dhan CSV exchange + segment to WebSocket ExchangeSegment enum. */
export { mapDhanExchangeSegment } from '../infrastructure/dhan-csv.util';

/**
 * Downloads Dhan scrip master CSV and maps securityId + exchangeSegment
 * onto existing instruments by trading symbol + exchange/segment heuristics.
 */
@Injectable()
export class DhanTokenSyncService {
  private readonly logger = new Logger(DhanTokenSyncService.name);

  constructor(
    @InjectModel(Instrument.name) private readonly instruments: Model<Instrument>,
  ) {}

  async syncTokens(fetchImpl: typeof fetch = fetch): Promise<DhanTokenSyncResult> {
    this.logger.log(`Downloading Dhan instrument master from ${DHAN_MASTER_URL}`);
    const res = await fetchMaster(
      DHAN_MASTER_URL,
      { headers: { Accept: 'text/csv' } },
      'Dhan instrument master',
      fetchImpl,
    );
    if (!res.ok) {
      throw new Error(`Dhan instrument master download failed (${res.status}) — check network access to images.dhan.co`);
    }

    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new Error('Dhan instrument master CSV is empty');

    const header = parseCsvLine(lines[0]);
    const col = (name: string) => dhanCsvColumnIndex(header, name);

    const idxSecurityId = col('SEM_SMST_SECURITY_ID');
    const idxExch = col('SEM_EXM_EXCH_ID');
    const idxSegment = col('SEM_SEGMENT');
    const idxInstrument = col('SEM_INSTRUMENT_NAME');
    const idxTradingSymbol = col('SEM_TRADING_SYMBOL');
    const idxCustomSymbol = col('SEM_CUSTOM_SYMBOL');
    const idxSymbolName = col('SM_SYMBOL_NAME');

    if (idxSecurityId < 0 || idxExch < 0 || idxSegment < 0) {
      throw new Error('Dhan CSV missing required columns');
    }

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
    let unmatchedDhan = 0;
    let skippedSegment = 0;
    const ops: Parameters<Model<Instrument>['bulkWrite']>[0] = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCsvLine(lines[i]);
      const securityId = fields[idxSecurityId]?.trim();
      const exchId = fields[idxExch]?.trim();
      const segment = fields[idxSegment]?.trim();
      if (!securityId || !exchId || !segment) continue;

      const instrumentName = idxInstrument >= 0 ? fields[idxInstrument]?.trim() : undefined;
      const exchangeSegment = mapDhanExchangeSegment(exchId, segment, instrumentName);
      if (!exchangeSegment || isBseDhanSegment(exchangeSegment)) {
        skippedSegment++;
        continue;
      }

      const tradingSymbol = (
        (idxTradingSymbol >= 0 ? fields[idxTradingSymbol] : undefined)
        || (idxCustomSymbol >= 0 ? fields[idxCustomSymbol] : undefined)
        || (idxSymbolName >= 0 ? fields[idxSymbolName] : undefined)
      )?.trim();
      if (!tradingSymbol) {
        unmatchedDhan++;
        continue;
      }

      const candidates = bySymbol.get(tradingSymbol.toUpperCase());
      if (!candidates?.length) {
        unmatchedDhan++;
        continue;
      }

      const inst = this.pickBestMatch(candidates, exchId, segment, instrumentName);
      if (!inst) {
        unmatchedDhan++;
        continue;
      }

      matched++;
      ops.push({
        updateOne: {
          filter: { instrumentKey: inst.instrumentKey },
          update: { $set: { dhanSecurityId: securityId, dhanExchangeSegment: exchangeSegment } },
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
      `Dhan token sync done: downloaded=${lines.length - 1} matched=${matched} updated=${updated}`,
    );
    return { downloaded: lines.length - 1, matched, updated, unmatchedDhan, skippedSegment };
  }

  private pickBestMatch(
    candidates: Array<{ instrumentKey: string; symbol: string; exchange: string; segment: string }>,
    exchId: string,
    segment: string,
    instrumentName?: string,
  ) {
    const seg = segment.toUpperCase();
    const inst = (instrumentName || '').toUpperCase();

    const wantExchange = 'NSE';
    let wantSegment: string | null = null;
    if (seg === 'E') {
      wantSegment = inst.includes('IDX') || inst === 'INDEX' ? 'INDEX' : 'EQ';
    } else if (seg === 'D') {
      wantSegment = 'FO';
    } else if (seg === 'C') {
      wantSegment = 'CUR';
    }

    const filtered = candidates.filter((c) => c.exchange === wantExchange);
    const pool = filtered.length ? filtered : candidates;

    if (wantSegment) {
      const segMatch = pool.filter((c) => c.segment === wantSegment);
      if (segMatch.length >= 1) return segMatch[0];
    }

    return pool.length >= 1 ? pool[0] : null;
  }
}
