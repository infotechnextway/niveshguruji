/**
 * Maps a raw Upstox BOD instrument row (from complete.json.gz) into our
 * Instrument schema shape. Returns null for segments we do not trade.
 */

export interface UpstoxInstrumentRow {
  instrument_key?: string;
  instrumentKey?: string;
  trading_symbol?: string;
  tradingsymbol?: string;
  name?: string;
  short_name?: string;
  exchange?: string;
  segment?: string;
  instrument_type?: string;
  lot_size?: number;
  tick_size?: number;
  freeze_quantity?: number;
  expiry?: string | number;
  strike_price?: number;
  strike?: number;
  underlying_key?: string;
  asset_key?: string;
  underlying_symbol?: string;
  asset_symbol?: string;
}

export interface MappedInstrument {
  instrumentKey: string;
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  segment: 'EQ' | 'FO' | 'CUR' | 'INDEX';
  lotSize: number;
  tickSize: number;
  freezeQty?: number;
  expiry?: string;
  strike?: number;
  optType?: 'CE' | 'PE';
  underlyingKey?: string;
  enabled: boolean;
}

const ALLOWED_SEGMENTS = new Set([
  'NSE_EQ',
  'NSE_FO',
  'NSE_INDEX',
  'NSE_CD', 'NCD_FO',
]);

function mapSegment(upstoxSegment: string): MappedInstrument['segment'] | null {
  if (upstoxSegment === 'NSE_EQ') return 'EQ';
  if (upstoxSegment === 'NSE_FO') return 'FO';
  if (upstoxSegment === 'NSE_INDEX') return 'INDEX';
  if (upstoxSegment === 'NSE_CD' || upstoxSegment === 'NCD_FO') return 'CUR';
  return null;
}

/** Upstox tick_size is typically in paise (5 → ₹0.05). Values < 1 are already rupees. */
export function normalizeTickSize(raw: number | undefined): number {
  if (raw === undefined || Number.isNaN(raw) || raw <= 0) return 0.05;
  return raw >= 1 ? +(raw / 100).toFixed(4) : raw;
}

export function formatExpiry(raw: string | number | undefined): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'number') {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString().slice(0, 10);
  }
  const s = String(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const asNum = Number(s);
  if (!Number.isNaN(asNum) && asNum > 0) return formatExpiry(asNum);
  return undefined;
}

function inferUnderlyingKey(row: UpstoxInstrumentRow, segment: MappedInstrument['segment']): string | undefined {
  const explicit = row.underlying_key || row.asset_key;
  if (explicit) return explicit;
  if (segment !== 'FO') return undefined;
  const name = (row.name || row.underlying_symbol || row.asset_symbol || '').toUpperCase();
  if (name.includes('NIFTY BANK') || name.startsWith('BANKNIFTY')) return 'NSE_INDEX|Nifty Bank';
  if (name.includes('FIN NIFTY') || name.includes('FINNIFTY') || name.startsWith('NIFTY FIN')) {
    return 'NSE_INDEX|Nifty Fin Service';
  }
  if (name.includes('NIFTY') && !name.includes('BANK')) return 'NSE_INDEX|Nifty 50';
  return undefined;
}

export function mapUpstoxInstrument(row: UpstoxInstrumentRow): MappedInstrument | null {
  const instrumentKey = row.instrument_key || row.instrumentKey;
  if (!instrumentKey) return null;

  const upstoxSegment = row.segment || '';
  if (!ALLOWED_SEGMENTS.has(upstoxSegment) || upstoxSegment.startsWith('BSE_')) return null;

  const segment = mapSegment(upstoxSegment);
  if (!segment) return null;

  const exchange = (row.exchange === 'BSE' ? 'BSE' : 'NSE') as 'NSE' | 'BSE';
  if (row.exchange && row.exchange !== 'NSE' && row.exchange !== 'BSE') return null;

  const symbol = row.trading_symbol || row.tradingsymbol || row.short_name || instrumentKey;
  const name = row.name || row.short_name || symbol;
  const instrumentType = (row.instrument_type || '').toUpperCase();

  let optType: 'CE' | 'PE' | undefined;
  if (instrumentType === 'CE' || instrumentType === 'PE') optType = instrumentType;
  else if (symbol.endsWith('CE')) optType = 'CE';
  else if (symbol.endsWith('PE')) optType = 'PE';

  const strike = row.strike_price ?? row.strike;
  const expiry = formatExpiry(row.expiry);
  const underlyingKey = inferUnderlyingKey(row, segment);

  return {
    instrumentKey,
    symbol,
    name,
    exchange,
    segment,
    lotSize: row.lot_size && row.lot_size > 0 ? row.lot_size : 1,
    tickSize: normalizeTickSize(row.tick_size),
    freezeQty: row.freeze_quantity,
    expiry,
    strike: strike !== undefined ? Number(strike) : undefined,
    optType,
    underlyingKey,
    enabled: true,
  };
}
