import { PipelineStage } from 'mongoose';

/** Default rank for symbols outside the curated priority lists. */
export const CATALOG_DEFAULT_PRIORITY_RANK = 9999;

/**
 * NIFTY 50 constituents in trader-friendly order (large caps first).
 * Uppercase trading symbols as stored in the instrument master.
 */
export const NIFTY_50_SYMBOLS: readonly string[] = [
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'INFY',
  'ICICIBANK',
  'SBIN',
  'BHARTIARTL',
  'ITC',
  'LT',
  'HINDUNILVR',
  'AXISBANK',
  'KOTAKBANK',
  'BAJFINANCE',
  'MARUTI',
  'ASIANPAINT',
  'HCLTECH',
  'SUNPHARMA',
  'TITAN',
  'ULTRACEMCO',
  'NTPC',
  'POWERGRID',
  'ONGC',
  'M&M',
  'TATAMOTORS',
  'WIPRO',
  'ADANIENT',
  'ADANIPORTS',
  'JSWSTEEL',
  'TATASTEEL',
  'COALINDIA',
  'NESTLEIND',
  'GRASIM',
  'TECHM',
  'CIPLA',
  'DRREDDY',
  'APOLLOHOSP',
  'EICHERMOT',
  'BPCL',
  'HEROMOTOCO',
  'INDUSINDBK',
  'DIVISLAB',
  'BRITANNIA',
  'HINDALCO',
  'SBILIFE',
  'BAJAJ-AUTO',
  'TRENT',
  'SHRIRAMFIN',
  'BAJAJFINSV',
  'BEL',
  'JIOFIN',
  'HDFCLIFE',
  'TATACONSUM',
  'ETERNAL',
];

/** instrumentKey suffixes for major NSE indices (after `NSE_INDEX|`). */
export const INDEX_PRIORITY_KEY_SUFFIXES: readonly string[] = [
  'Nifty 50',
  'Nifty Bank',
  'Nifty Fin Service',
  'Nifty Mid Select',
  'Nifty Next 50',
  'Nifty 100',
  'Nifty 500',
];

/** Symbol variants for index pinning when suffix differs across feeds. */
export const INDEX_PRIORITY_SYMBOLS: readonly string[] = [
  'NIFTY 50',
  'NIFTY50',
  'NIFTY',
  'BANKNIFTY',
  'NIFTY BANK',
  'NIFTY BANK INDEX',
  'FINNIFTY',
  'NIFTY FIN SERVICE',
  'NIFTY FINANCIAL SERVICES',
  'MIDCPNIFTY',
  'NIFTY MID SELECT',
  'NIFTYNXT50',
  'NIFTY NEXT 50',
  'NIFTY 100',
  'NIFTY 500',
];

function rankFromIndex(idxExpr: unknown): Record<string, unknown> {
  return {
    $cond: [
      { $eq: [idxExpr, -1] },
      CATALOG_DEFAULT_PRIORITY_RANK,
      idxExpr,
    ],
  };
}

/** Sort stages for segment browse — priority names first, then symbol A→Z. */
export function catalogBrowseSortStages(segment: string): PipelineStage[] {
  if (segment === 'EQ') {
    return [
      {
        $addFields: {
          _priorityRank: rankFromIndex({
            $indexOfArray: [NIFTY_50_SYMBOLS, { $toUpper: '$symbol' }],
          }),
        },
      },
      { $sort: { _priorityRank: 1, symbol: 1, instrumentKey: 1 } },
      { $project: { _priorityRank: 0 } },
    ];
  }

  if (segment === 'INDEX') {
    return [
      {
        $addFields: {
          _keySuffix: { $arrayElemAt: [{ $split: ['$instrumentKey', '|'] }, 1] },
          _symUpper: { $toUpper: '$symbol' },
        },
      },
      {
        $addFields: {
          _priorityRank: {
            $min: [
              rankFromIndex({ $indexOfArray: [INDEX_PRIORITY_KEY_SUFFIXES, '$_keySuffix'] }),
              rankFromIndex({ $indexOfArray: [INDEX_PRIORITY_SYMBOLS, '$_symUpper'] }),
            ],
          },
        },
      },
      { $sort: { _priorityRank: 1, symbol: 1, instrumentKey: 1 } },
      { $project: { _priorityRank: 0, _keySuffix: 0, _symUpper: 0 } },
    ];
  }

  return [{ $sort: { symbol: 1, instrumentKey: 1 } }];
}

/** Client-side belt-and-suspenders sort (same rules as catalogBrowseSortStages). */
export function compareCatalogBrowse(
  a: { symbol: string; instrumentKey: string },
  b: { symbol: string; instrumentKey: string },
  segment: string,
): number {
  const rank = (row: { symbol: string; instrumentKey: string }) => {
    if (segment === 'EQ') {
      const idx = NIFTY_50_SYMBOLS.indexOf(row.symbol.toUpperCase());
      return idx === -1 ? CATALOG_DEFAULT_PRIORITY_RANK : idx;
    }
    if (segment === 'INDEX') {
      const suffix = row.instrumentKey.split('|')[1] ?? '';
      const byKey = INDEX_PRIORITY_KEY_SUFFIXES.indexOf(suffix);
      const bySym = INDEX_PRIORITY_SYMBOLS.indexOf(row.symbol.toUpperCase());
      const ranks = [byKey, bySym].filter((i) => i !== -1);
      return ranks.length ? Math.min(...ranks) : CATALOG_DEFAULT_PRIORITY_RANK;
    }
    return CATALOG_DEFAULT_PRIORITY_RANK;
  };
  const dr = rank(a) - rank(b);
  if (dr !== 0) return dr;
  const sym = a.symbol.localeCompare(b.symbol);
  return sym !== 0 ? sym : a.instrumentKey.localeCompare(b.instrumentKey);
}
