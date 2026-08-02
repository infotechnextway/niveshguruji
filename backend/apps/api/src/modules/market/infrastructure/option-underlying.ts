/**
 * FO contracts in Mongo reference Upstox underlying keys (NSE_INDEX|…, NSE_EQ|…).
 * Trader catalog dedupes to DHAN keys — resolve any key to the FO underlyingKey.
 */

const UPSTOX_KEY = /^(NSE|BSE)_(EQ|INDEX|FO|CUR)/;

/** Index symbol variants → Upstox underlying instrumentKey. */
const INDEX_SYMBOL_TO_UNDERLYING: Record<string, string> = {
  'NIFTY 50': 'NSE_INDEX|Nifty 50',
  NIFTY50: 'NSE_INDEX|Nifty 50',
  NIFTY: 'NSE_INDEX|Nifty 50',
  BANKNIFTY: 'NSE_INDEX|Nifty Bank',
  'NIFTY BANK': 'NSE_INDEX|Nifty Bank',
  'NIFTY BANK INDEX': 'NSE_INDEX|Nifty Bank',
  FINNIFTY: 'NSE_INDEX|Nifty Fin Service',
  'NIFTY FIN SERVICE': 'NSE_INDEX|Nifty Fin Service',
  'NIFTY FINANCIAL SERVICES': 'NSE_INDEX|Nifty Fin Service',
  MIDCPNIFTY: 'NSE_INDEX|Nifty Mid Select',
  'NIFTY MID SELECT': 'NSE_INDEX|Nifty Mid Select',
  NIFTYNXT50: 'NSE_INDEX|Nifty Next 50',
  'NIFTY NEXT 50': 'NSE_INDEX|Nifty Next 50',
};

export function isUpstoxInstrumentKey(key: string): boolean {
  return UPSTOX_KEY.test(key);
}

/** Static map for major indices when only symbol/name is known. */
export function indexSymbolToUnderlyingKey(symbol: string): string | undefined {
  return INDEX_SYMBOL_TO_UNDERLYING[symbol.trim().toUpperCase()];
}

export interface UnderlyingInstrumentRow {
  instrumentKey?: string;
  symbol: string;
  name?: string;
  exchange: string;
  segment: string;
  underlyingKey?: string;
}

/**
 * Resolve a trader-facing instrument key to the Upstox underlyingKey used by FO rows.
 * Returns the input unchanged when already suitable or no mapping exists.
 */
export function resolveOptionUnderlyingKey(
  inputKey: string,
  inst: UnderlyingInstrumentRow | null,
): string {
  if (isUpstoxInstrumentKey(inputKey)) {
    if (inst?.segment === 'INDEX' || inst?.segment === 'EQ') return inputKey;
    if (inst?.underlyingKey && isUpstoxInstrumentKey(inst.underlyingKey)) return inst.underlyingKey;
    return inputKey;
  }

  if (inst?.underlyingKey && isUpstoxInstrumentKey(inst.underlyingKey)) {
    return inst.underlyingKey;
  }

  if (inst?.segment === 'INDEX') {
    const mapped = indexSymbolToUnderlyingKey(inst.symbol)
      ?? (inst.name ? indexSymbolToUnderlyingKey(inst.name) : undefined);
    if (mapped) return mapped;
  }

  // Caller may look up NSE_EQ|… by symbol when segment is EQ.
  return inputKey;
}
