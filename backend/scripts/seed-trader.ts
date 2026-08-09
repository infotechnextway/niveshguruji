/* eslint-disable no-console */
import mongoose from 'mongoose';
import * as argon2 from 'argon2';

/**
 * Seeds a dev trader account (insert-only / status refresh). Idempotent.
 *
 * Usage:
 *   TRADER_EMAIL=trader@test.local TRADER_PASSWORD=TestPass123! npm run seed:trader
 */
async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  const email = (process.env.TRADER_EMAIL || 'trader@test.local').toLowerCase();
  const password = process.env.TRADER_PASSWORD || 'TestPass123!';
  const name = process.env.TRADER_NAME || 'Dev Trader';
  if (!uri) throw new Error('MONGO_URI is required');
  if (password.length < 8) throw new Error('TRADER_PASSWORD must be at least 8 characters');

  await mongoose.connect(uri);
  const col = mongoose.connection.db!.collection('users');
  const existing = await col.findOne({ email });
  const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

  if (existing) {
    await col.updateOne(
      { _id: existing._id },
      {
        $set: {
          status: 'ACTIVE',
          kycStatus: 'APPROVED',
          mobileVerified: true,
          emailVerified: true,
          updatedAt: new Date(),
        },
      },
    );
    console.log(`Trader ${email} already exists — ensured ACTIVE + APPROVED KYC`);
  } else {
    const username = email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 20) || 'trader';
    await col.insertOne({
      name,
      email,
      mobile: '+919999999999',
      username,
      usernameLower: username.toLowerCase(),
      passwordHash: hash,
      address: 'Dev seed address',
      incomeType: 'SALARIED',
      monthlyIncome: 100000,
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      mobileVerified: true,
      emailVerified: true,
      approvedAt: new Date(),
      referralCode: `T${Date.now().toString().slice(-6)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Created trader ${email} (password from TRADER_PASSWORD env)`);
  }
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
