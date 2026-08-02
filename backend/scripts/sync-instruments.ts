/* eslint-disable no-console */
/**
 * Downloads the full Upstox instrument master into MongoDB.
 * Usage: MONGO_URI=... npm run sync:instruments
 */
import 'reflect-metadata';
import mongoose from 'mongoose';
import { Instrument, InstrumentSchema } from '../apps/api/src/modules/market/infrastructure/schemas/instrument.schema';
import { InstrumentSyncService } from '../apps/api/src/modules/market/application/instrument-sync.service';

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required');
  await mongoose.connect(uri);
  const model = mongoose.model(Instrument.name, InstrumentSchema);
  const sync = new InstrumentSyncService(model as never);
  const result = await sync.syncFromUpstox();
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
