/* eslint-disable no-console */
import mongoose from 'mongoose';
import { CONFIG_REGISTRY } from '../libs/shared/src/config/config-keys';

/**
 * Seeds app_config with registry defaults (insert-only: never overwrites an
 * admin-tuned value) and loads the initial NSE/BSE holiday list for the
 * current year if the collection is empty. Idempotent — safe to re-run.
 *
 * Usage: MONGO_URI=... npm run seed:config
 */
async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI env var is required');
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  const configCol = db.collection('app_config');
  let inserted = 0;
  for (const [key, def] of Object.entries(CONFIG_REGISTRY)) {
    const res = await configCol.updateOne(
      { key },
      { $setOnInsert: { key, value: def.default, updatedBy: 'seed', createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true },
    );
    if (res.upsertedCount) inserted++;
  }
  console.log(`app_config: ${inserted} defaults inserted (existing values untouched)`);

  const holidayCol = db.collection('market_holidays');
  await holidayCol.createIndex({ date: 1 }, { unique: true });
  const count = await holidayCol.countDocuments();
  if (count === 0) {
    // NSE/BSE trading holidays 2026 (exchange-published list). Admin panel
    // (Operations) maintains this collection thereafter — see US-ADM-6.
    const holidays2026: Array<{ date: string; description: string }> = [
      { date: '2026-01-26', description: 'Republic Day' },
      { date: '2026-03-04', description: 'Holi' },
      { date: '2026-03-27', description: 'Ram Navami' },
      { date: '2026-04-03', description: 'Good Friday' },
      { date: '2026-04-14', description: 'Dr. Ambedkar Jayanti' },
      { date: '2026-05-01', description: 'Maharashtra Day' },
      { date: '2026-05-28', description: 'Bakri Eid' },
      { date: '2026-06-26', description: 'Muharram' },
      { date: '2026-08-15', description: 'Independence Day' },
      { date: '2026-09-14', description: 'Ganesh Chaturthi' },
      { date: '2026-10-02', description: 'Gandhi Jayanti' },
      { date: '2026-10-20', description: 'Dussehra' },
      { date: '2026-11-10', description: 'Diwali Balipratipada' },
      { date: '2026-11-24', description: 'Guru Nanak Jayanti' },
      { date: '2026-12-25', description: 'Christmas' },
    ];
    await holidayCol.insertMany(
      holidays2026.map((h) => ({ ...h, exchanges: ['NSE', 'BSE'], createdAt: new Date(), updatedAt: new Date() })),
    );
    console.log(`market_holidays: seeded ${holidays2026.length} entries for 2026 — verify against the official exchange circular before go-live`);
  } else {
    console.log(`market_holidays: ${count} entries present, skipping`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
