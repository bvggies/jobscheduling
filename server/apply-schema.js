#!/usr/bin/env node
/**
 * Applies schema from initializeDatabase() (this project has no separate SQL migrations).
 * If no admin users exist, creates one (INITIAL_ADMIN_* env or defaults — see server/config/database.js).
 * Usage: DATABASE_URL="postgresql://..." node apply-schema.js
 */
require('dotenv').config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL to your Neon connection string.');
    process.exit(1);
  }
  const db = require('./config/database');
  try {
    await db.pool.query('SELECT NOW()');
    await db.initializeDatabase();
    console.log('Schema applied successfully.');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();
