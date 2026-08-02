/* eslint-disable no-console */
import mongoose from 'mongoose';

/**
 * Seeds a starter instrument master (insert-only). For CI smoke and local
 * bootstrap only. Production / full master: `npm run sync:instruments` or
 * Admin → Instruments → Sync from Upstox.
 *
 * Usage: MONGO_URI=... npm run seed:instruments
 */
async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required');
  await mongoose.connect(uri);
  const col = mongoose.connection.db!.collection('instruments');
  await col.createIndex({ instrumentKey: 1 }, { unique: true });

  const now = () => new Date();
  const docs: Record<string, unknown>[] = [];

  // Indices (pinned tickers use NIFTY + BANKNIFTY).
  const indices = [
    { key: 'NSE_INDEX|Nifty 50', symbol: 'NIFTY 50', name: 'Nifty 50' },
    { key: 'NSE_INDEX|Nifty Bank', symbol: 'BANKNIFTY', name: 'Nifty Bank' },
    { key: 'NSE_INDEX|Nifty Fin Service', symbol: 'FINNIFTY', name: 'Nifty Financial Services' },
  ];
  for (const i of indices) {
    docs.push({ instrumentKey: i.key, symbol: i.symbol, name: i.name, exchange: 'NSE', segment: 'INDEX', lotSize: 1, tickSize: 0.05, enabled: true, createdAt: now(), updatedAt: now() });
  }

  // A handful of large-cap equities.
  const equities = [
    ['NSE_EQ|INE002A01018', 'RELIANCE', 'Reliance Industries'],
    ['NSE_EQ|INE467B01029', 'TCS', 'Tata Consultancy Services'],
    ['NSE_EQ|INE040A01034', 'HDFCBANK', 'HDFC Bank'],
    ['NSE_EQ|INE009A01021', 'INFY', 'Infosys'],
    ['NSE_EQ|INE090A01021', 'ICICIBANK', 'ICICI Bank'],
  ];
  for (const [key, symbol, name] of equities) {
    docs.push({ instrumentKey: key, symbol, name, exchange: 'NSE', segment: 'EQ', lotSize: 1, tickSize: 0.05, enabled: true, createdAt: now(), updatedAt: now() });
  }

  // A NIFTY option chain around ATM (index options only at launch).
  const underlyingKey = 'NSE_INDEX|Nifty 50';
  const expiry = '2026-08-27';
  const atm = 22000;
  for (let strike = atm - 500; strike <= atm + 500; strike += 50) {
    for (const optType of ['CE', 'PE'] as const) {
      const key = `NSE_FO|NIFTY${expiry.replace(/-/g, '')}${strike}${optType}`;
      docs.push({
        instrumentKey: key, symbol: `NIFTY ${strike} ${optType}`, name: `NIFTY ${expiry} ${strike} ${optType}`,
        exchange: 'NSE', segment: 'FO', lotSize: 75, tickSize: 0.05, freezeQty: 1800,
        expiry, strike, optType, underlyingKey, enabled: true, createdAt: now(), updatedAt: now(),
      });
    }
  }

  let inserted = 0;
  for (const d of docs) {
    const res = await col.updateOne({ instrumentKey: d.instrumentKey }, { $setOnInsert: d }, { upsert: true });
    if (res.upsertedCount) inserted++;
  }
  console.log(`instruments: ${inserted} inserted (${docs.length - inserted} already present)`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
