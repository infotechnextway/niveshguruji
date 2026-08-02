/* eslint-disable no-console */
import mongoose from 'mongoose';
import {
  CATALOG_DEDUPE_STAGES,
  CATALOG_PROJECT,
  traderSegmentMatch,
} from '../apps/api/src/modules/market/infrastructure/catalog-aggregation';
import { catalogBrowseSortStages } from '../apps/api/src/modules/market/infrastructure/catalog-priority';

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required');
  await mongoose.connect(uri);
  const col = mongoose.connection.db!.collection('instruments');

  for (const segment of ['EQ', 'INDEX'] as const) {
    const rows = await col.aggregate([
      { $match: traderSegmentMatch(segment) },
      ...CATALOG_DEDUPE_STAGES,
      ...catalogBrowseSortStages(segment),
      { $limit: 10 },
      { $project: CATALOG_PROJECT },
    ], { allowDiskUse: true }).toArray();
    console.log(`\n=== ${segment} (first 10) ===`);
    for (const r of rows) {
      console.log(`  ${r.symbol}  (${r.instrumentKey})`);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
