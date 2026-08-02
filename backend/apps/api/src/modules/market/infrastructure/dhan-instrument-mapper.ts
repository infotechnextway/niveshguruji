import { formatExpiry, MappedInstrument, normalizeTickSize } from './instrument-mapper';
import { mapDhanExchangeSegment } from './dhan-csv.util';
import { isBseDhanSegment } from './trader-catalog';

export interface MappedDhanInstrument extends MappedInstrument {
  dhanSecurityId: string;
  dhanExchangeSegment: string;
}

function mapDhanSegment(dhanExchangeSegment: string): MappedInstrument['segment'] | null {
  if (dhanExchangeSegment === 'NSE_EQ') return 'EQ';
  if (dhanExchangeSegment === 'IDX_I') return 'INDEX';
  if (dhanExchangeSegment === 'NSE_FNO') return 'FO';
  if (dhanExchangeSegment === 'NSE_CURRENCY') return 'CUR';
  return null;
}

function mapDhanExchange(dhanExchangeSegment: string): 'NSE' | 'BSE' | null {
  if (isBseDhanSegment(dhanExchangeSegment)) return null;
  if (
    dhanExchangeSegment.startsWith('NSE_')
    || dhanExchangeSegment === 'IDX_I'
  ) {
    return 'NSE';
  }
  return null;
}

function inferUnderlyingKey(name: string, segment: MappedInstrument['segment']): string | undefined {
  if (segment !== 'FO') return undefined;
  const upper = name.toUpperCase();
  if (upper.includes('NIFTY BANK') || upper.startsWith('BANKNIFTY')) return 'NSE_INDEX|Nifty Bank';
  if (upper.includes('FIN NIFTY') || upper.includes('FINNIFTY') || upper.startsWith('NIFTY FIN')) {
    return 'NSE_INDEX|Nifty Fin Service';
  }
  if (upper.includes('NIFTY') && !upper.includes('BANK')) return 'NSE_INDEX|Nifty 50';
  return undefined;
}

export interface DhanCsvColumns {
  securityId: number;
  exch: number;
  segment: number;
  instrument: number;
  tradingSymbol: number;
  customSymbol: number;
  symbolName: number;
  lotUnits: number;
  tickSize: number;
  expiryDate: number;
  strikePrice: number;
  optionType: number;
}

/** Map one Dhan scrip-master CSV row into our instrument schema. */
export function mapDhanInstrument(
  fields: string[],
  col: DhanCsvColumns,
): MappedDhanInstrument | null {
  const securityId = fields[col.securityId]?.trim();
  const exchId = fields[col.exch]?.trim();
  const segment = fields[col.segment]?.trim();
  if (!securityId || !exchId || !segment) return null;

  const instrumentName = col.instrument >= 0 ? fields[col.instrument]?.trim() : undefined;
  const dhanExchangeSegment = mapDhanExchangeSegment(exchId, segment, instrumentName);
  if (!dhanExchangeSegment || isBseDhanSegment(dhanExchangeSegment)) return null;

  const exchange = mapDhanExchange(dhanExchangeSegment);
  const mappedSegment = mapDhanSegment(dhanExchangeSegment);
  if (!exchange || !mappedSegment) return null;

  const tradingSymbol = (
    (col.tradingSymbol >= 0 ? fields[col.tradingSymbol] : undefined)
    || (col.customSymbol >= 0 ? fields[col.customSymbol] : undefined)
    || (col.symbolName >= 0 ? fields[col.symbolName] : undefined)
  )?.trim();
  if (!tradingSymbol) return null;

  const name = (
    (col.customSymbol >= 0 ? fields[col.customSymbol]?.trim() : undefined)
    || (col.symbolName >= 0 ? fields[col.symbolName]?.trim() : undefined)
    || tradingSymbol
  );

  const lotRaw = col.lotUnits >= 0 ? Number(fields[col.lotUnits]) : NaN;
  const tickRaw = col.tickSize >= 0 ? Number(fields[col.tickSize]) : undefined;
  const strikeRaw = col.strikePrice >= 0 ? Number(fields[col.strikePrice]) : undefined;
  const optRaw = col.optionType >= 0 ? fields[col.optionType]?.trim().toUpperCase() : '';

  let optType: 'CE' | 'PE' | undefined;
  if (optRaw === 'CE' || optRaw === 'PE') optType = optRaw;

  const strike = strikeRaw !== undefined && strikeRaw > 0 ? strikeRaw : undefined;
  const expiryRaw = col.expiryDate >= 0 ? fields[col.expiryDate]?.trim() : undefined;
  const expiry = expiryRaw ? formatExpiry(expiryRaw.split(' ')[0]) : undefined;
  const underlyingKey = inferUnderlyingKey(name, mappedSegment);

  return {
    instrumentKey: `DHAN|${dhanExchangeSegment}|${securityId}`,
    symbol: tradingSymbol,
    name,
    exchange,
    segment: mappedSegment,
    lotSize: lotRaw > 0 ? Math.round(lotRaw) : 1,
    tickSize: normalizeTickSize(tickRaw),
    expiry,
    strike,
    optType,
    underlyingKey,
    enabled: true,
    dhanSecurityId: securityId,
    dhanExchangeSegment,
  };
}
