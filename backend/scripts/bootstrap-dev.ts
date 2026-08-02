/* eslint-disable no-console */
/**
 * One-shot local bootstrap: config defaults, starter instruments (if empty),
 * dev trader account. Does not overwrite admin-tuned DB values.
 *
 * Usage (from backend/): npm run bootstrap:dev
 */
import { execSync } from 'child_process';

function run(label: string, script: string): void {
  console.log(`\n▶ ${label}`);
  execSync(`npx ts-node -r tsconfig-paths/register scripts/${script}`, {
    stdio: 'inherit',
    env: process.env,
  });
}

async function ensureInstruments(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required');
  const mongoose = await import('mongoose');
  await mongoose.default.connect(uri);
  const count = await mongoose.default.connection.db!.collection('instruments').countDocuments();
  await mongoose.default.disconnect();
  if (count > 0) {
    console.log(`\n▶ instruments: ${count} already in Mongo — skipping seed:instruments`);
    return;
  }
  run('Seeding starter instruments (empty DB)', 'seed-instruments.ts');
}

async function main(): Promise<void> {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required — copy backend/.env.example to backend/.env');
  }
  run('Seeding app_config + holidays', 'seed-config.ts');
  await ensureInstruments();
  run('Seeding dev trader', 'seed-trader.ts');
  console.log('\nBootstrap complete.');
  console.log('Trader login: trader@test.local / TestPass123! (override via TRADER_EMAIL / TRADER_PASSWORD)');
  console.log('Live feed: set MARKET_FEED=upstox|dhan|angel|simulator in backend/.env (+ provider tokens)');
}

main().catch((err) => { console.error(err); process.exit(1); });
