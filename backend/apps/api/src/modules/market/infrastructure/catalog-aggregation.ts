import { PipelineStage } from 'mongoose';
import { traderCatalogMatch } from './trader-catalog';

export { catalogBrowseSortStages, compareCatalogBrowse, NIFTY_50_SYMBOLS } from './catalog-priority';

/** Exclude derivative markers from the EQ (Stocks) tab. */
const EQ_ONLY_FILTER = {
  $and: [
    { $or: [{ optType: { $exists: false } }, { optType: null }] },
    { $or: [{ expiry: { $exists: false } }, { expiry: null }] },
    { $or: [{ strike: { $exists: false } }, { strike: null }, { strike: 0 }] },
    { symbol: { $not: { $regex: /NSETEST/i } } },
  ],
};

/** Mongo match for trader catalog browse/count/search — same filters listBySegment uses. */
export function traderSegmentMatch(segment: string): Record<string, unknown> {
  const base = traderCatalogMatch({ segment });
  if (segment === 'EQ') {
    return { ...base, ...EQ_ONLY_FILTER };
  }
  return base;
}

const symKeyField = { _symKey: { $toUpper: '$symbol' } };

const dhanPrefField = {
  _pref: {
    $cond: [{ $regexMatch: { input: '$instrumentKey', regex: /^DHAN\|/ } }, 1, 0],
  },
};

/** Count distinct catalog symbols — no global sort (safe on Atlas M0 / no allowDiskUse). */
export const CATALOG_COUNT_STAGES: PipelineStage[] = [
  { $addFields: symKeyField },
  {
    $group: {
      _id: { exchange: '$exchange', segment: '$segment', symbol: '$_symKey' },
    },
  },
  { $count: 'total' },
];

/**
 * Dedupe Upstox + Dhan rows; prefer Dhan instrumentKey within each symbol group.
 * Uses $top per group instead of sorting the full segment into memory.
 */
export const CATALOG_DEDUPE_STAGES: PipelineStage[] = [
  { $addFields: { ...symKeyField, ...dhanPrefField } },
  {
    $group: {
      _id: { exchange: '$exchange', segment: '$segment', symbol: '$_symKey' },
      doc: {
        $top: {
          sortBy: { _pref: -1, instrumentKey: 1 },
          output: '$$ROOT',
        },
      },
    },
  },
  { $replaceRoot: { newRoot: '$doc' } },
  { $project: { _pref: 0, _symKey: 0 } },
];

export const CATALOG_PROJECT = {
  instrumentKey: 1,
  symbol: 1,
  name: 1,
  exchange: 1,
  segment: 1,
  lotSize: 1,
  tickSize: 1,
  expiry: 1,
  strike: 1,
  optType: 1,
  underlyingKey: 1,
};
