/* eslint-disable no-console */
import mongoose from 'mongoose';
import * as argon2 from 'argon2';

/**
 * Creates the initial SUPER_ADMIN employee. Idempotent: refuses to run if any
 * employee already exists (later employees are created via the P2 admin panel).
 *
 * Usage: MONGO_URI=... ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run seed:admin
 *
 * The seeded account has TOTP disabled — enable it via
 * POST /admin/auth/totp/setup + /enable IMMEDIATELY after first login.
 */
async function main(): Promise<void> {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }
  if (ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  }
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db!.collection('employees');
  if (await col.countDocuments()) {
    console.log('Employees already exist — refusing to seed. Use the admin panel.');
  } else {
    await col.insertOne({
      email: ADMIN_EMAIL.toLowerCase(),
      name: ADMIN_NAME ?? 'Super Admin',
      passwordHash: await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      roles: ['SUPER_ADMIN'],
      permAllow: [],
      permDeny: [],
      totpEnabled: false,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Super admin ${ADMIN_EMAIL} created. Enable TOTP immediately after first login.`);
  }
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
