import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { gunzipSync } from 'zlib';
import {
  DHAN_MASTER_URL,
  dhanCsvColumnIndex,
  parseCsvLine,
} from '../infrastructure/dhan-csv.util';
import { fetchMaster } from '../infrastructure/fetch-master';
import { mapDhanInstrument } from '../infrastructure/dhan-instrument-mapper';
import { Instrument } from '../infrastructure/schemas/instrument.schema';
import { mapUpstoxInstrument, UpstoxInstrumentRow } from '../infrastructure/instrument-mapper';

const MASTER_URL = 'https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz';
const BATCH = 1000;

export interface InstrumentSyncResult {
  downloaded: number;
  mapped: number;
  upserted: number;
  skipped: number;
}

/**
 * Downloads the Upstox BOD instrument master, maps NSE EQ/FO/INDEX/CUR rows
 * into our schema, bulk-upserts by instrumentKey, and ensures search indexes.
 */
@Injectable()
export class InstrumentSyncService {
  private readonly logger = new Logger(InstrumentSyncService.name);

  constructor(
    @InjectModel(Instrument.name) private readonly instruments: Model<Instrument>,
  ) {}

  async syncFromUpstox(fetchImpl: typeof fetch = fetch): Promise<InstrumentSyncResult> {
    this.logger.log(`Downloading instrument master from ${MASTER_URL}`);
    const res = await fetchImpl(MASTER_URL, { headers: { Accept: 'application/gzip, application/json' } });
    if (!res.ok) throw new Error(`Instrument master download failed: ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());
    const jsonText = this.decodeMaster(buf);
    const rows = JSON.parse(jsonText) as UpstoxInstrumentRow[];
    if (!Array.isArray(rows)) throw new Error('Instrument master is not a JSON array');

    await this.ensureIndexes();

    let mapped = 0;
    let skipped = 0;
    let upserted = 0;
    const ops: Parameters<Model<Instrument>['bulkWrite']>[0] = [];

    for (const row of rows) {
      const doc = mapUpstoxInstrument(row);
      if (!doc) { skipped++; continue; }
      mapped++;
      ops.push({
        updateOne: {
          filter: { instrumentKey: doc.instrumentKey },
          update: {
            $set: {
              symbol: doc.symbol,
              name: doc.name,
              exchange: doc.exchange,
              segment: doc.segment,
              lotSize: doc.lotSize,
              tickSize: doc.tickSize,
              freezeQty: doc.freezeQty,
              expiry: doc.expiry,
              strike: doc.strike,
              optType: doc.optType,
              underlyingKey: doc.underlyingKey,
            },
            $setOnInsert: { enabled: true },
          },
          upsert: true,
        },
      });

      if (ops.length >= BATCH) {
        const result = await this.instruments.bulkWrite(ops, { ordered: false });
        upserted += (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0) + (result.matchedCount ?? 0);
        ops.length = 0;
      }
    }

    if (ops.length) {
      const result = await this.instruments.bulkWrite(ops, { ordered: false });
      upserted += (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0) + (result.matchedCount ?? 0);
    }

    this.logger.log(`Instrument sync done: downloaded=${rows.length} mapped=${mapped} skipped=${skipped}`);
    const disabledBse = await this.disableBseInstruments();
    if (disabledBse) this.logger.log(`Disabled ${disabledBse} existing BSE instruments`);
    return { downloaded: rows.length, mapped, upserted, skipped };
  }

  async syncFromDhan(fetchImpl: typeof fetch = fetch): Promise<InstrumentSyncResult> {
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
    const col = {
      securityId: dhanCsvColumnIndex(header, 'SEM_SMST_SECURITY_ID'),
      exch: dhanCsvColumnIndex(header, 'SEM_EXM_EXCH_ID'),
      segment: dhanCsvColumnIndex(header, 'SEM_SEGMENT'),
      instrument: dhanCsvColumnIndex(header, 'SEM_INSTRUMENT_NAME'),
      tradingSymbol: dhanCsvColumnIndex(header, 'SEM_TRADING_SYMBOL'),
      customSymbol: dhanCsvColumnIndex(header, 'SEM_CUSTOM_SYMBOL'),
      symbolName: dhanCsvColumnIndex(header, 'SM_SYMBOL_NAME'),
      lotUnits: dhanCsvColumnIndex(header, 'SEM_LOT_UNITS'),
      tickSize: dhanCsvColumnIndex(header, 'SEM_TICK_SIZE'),
      expiryDate: dhanCsvColumnIndex(header, 'SEM_EXPIRY_DATE'),
      strikePrice: dhanCsvColumnIndex(header, 'SEM_STRIKE_PRICE'),
      optionType: dhanCsvColumnIndex(header, 'SEM_OPTION_TYPE'),
    };
    if (col.securityId < 0 || col.exch < 0 || col.segment < 0) {
      throw new Error('Dhan CSV missing required columns');
    }

    await this.ensureIndexes();

    let mapped = 0;
    let skipped = 0;
    let upserted = 0;
    const ops: Parameters<Model<Instrument>['bulkWrite']>[0] = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCsvLine(lines[i]);
      const doc = mapDhanInstrument(fields, col);
      if (!doc) { skipped++; continue; }
      mapped++;
      ops.push({
        updateOne: {
          filter: { instrumentKey: doc.instrumentKey },
          update: {
            $set: {
              symbol: doc.symbol,
              name: doc.name,
              exchange: doc.exchange,
              segment: doc.segment,
              lotSize: doc.lotSize,
              tickSize: doc.tickSize,
              expiry: doc.expiry,
              strike: doc.strike,
              optType: doc.optType,
              underlyingKey: doc.underlyingKey,
              dhanSecurityId: doc.dhanSecurityId,
              dhanExchangeSegment: doc.dhanExchangeSegment,
            },
            $setOnInsert: { enabled: true },
          },
          upsert: true,
        },
      });

      if (ops.length >= BATCH) {
        const result = await this.instruments.bulkWrite(ops, { ordered: false });
        upserted += (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0) + (result.matchedCount ?? 0);
        ops.length = 0;
      }
    }

    if (ops.length) {
      const result = await this.instruments.bulkWrite(ops, { ordered: false });
      upserted += (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0) + (result.matchedCount ?? 0);
    }

    this.logger.log(
      `Dhan instrument sync done: downloaded=${lines.length - 1} mapped=${mapped} skipped=${skipped}`,
    );
    const disabledBse = await this.disableBseInstruments();
    if (disabledBse) this.logger.log(`Disabled ${disabledBse} existing BSE instruments`);
    return { downloaded: lines.length - 1, mapped, upserted, skipped };
  }

  private decodeMaster(buf: Buffer): string {
    // gzip magic 1f 8b
    if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
      return gunzipSync(buf).toString('utf8');
    }
    return buf.toString('utf8');
  }

  async ensureIndexes(): Promise<void> {
    const col = this.instruments.collection;
    await Promise.all([
      col.createIndex({ instrumentKey: 1 }, { unique: true }),
      col.createIndex({ symbol: 'text', name: 'text' }),
      col.createIndex({ segment: 1, enabled: 1 }),
      col.createIndex({ underlyingKey: 1, expiry: 1, strike: 1 }),
      col.createIndex({ symbol: 1 }),
      col.createIndex({ exchange: 1, segment: 1, symbol: 1 }),
    ]);
  }

  /** One-shot cleanup: hide any legacy BSE rows from trader catalog. */
  private async disableBseInstruments(): Promise<number> {
    const res = await this.instruments.updateMany(
      {
        enabled: true,
        $or: [
          { exchange: 'BSE' },
          { instrumentKey: { $regex: /^BSE_/ } },
          { instrumentKey: { $regex: /^DHAN\|BSE_/ } },
          { dhanExchangeSegment: { $regex: /^BSE_/ } },
        ],
      },
      { $set: { enabled: false } },
    );
    return res.modifiedCount ?? 0;
  }
}
