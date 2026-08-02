/** Trader-facing catalog is NSE-only; BSE rows stay in DB for admin/feed decode but are hidden. */
export const TRADER_EXCHANGE = 'NSE' as const;

const BSE_UPSTOX_SEGMENTS = new Set(['BSE_EQ', 'BSE_FO', 'BSE_INDEX', 'BCD_FO']);
const BSE_DHAN_PREFIX = 'BSE_';

export function isBseUpstoxSegment(segment: string): boolean {
  return BSE_UPSTOX_SEGMENTS.has(segment);
}

export function isBseDhanSegment(dhanExchangeSegment: string): boolean {
  return dhanExchangeSegment.startsWith(BSE_DHAN_PREFIX);
}

export function isBseExchange(exchange: string): boolean {
  return exchange === 'BSE';
}

/** Mongo match for enabled instruments visible in trader search / segment browse. */
export function traderCatalogMatch(extra: Record<string, unknown> = {}): Record<string, unknown> {
  const base: Record<string, unknown> = { enabled: true, exchange: TRADER_EXCHANGE };
  if (!('instrumentKey' in extra)) {
    base.$nor = [
      { instrumentKey: { $regex: /^BSE_/ } },
      { instrumentKey: { $regex: /^DHAN\|BSE_/ } },
    ];
  }
  return { ...base, ...extra };
}
