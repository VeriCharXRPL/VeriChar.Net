'use strict';

const { Pool } = require('pg');
const { syncEoBmfRegistry } = require('./irsRegistry');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to sync IRS data.');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: true },
    max: 1,
  });
  try {
    const result = await syncEoBmfRegistry({ pool });
    console.log(
      `Imported ${result.recordCount} unique EO BMF records `
      + `(snapshot ${result.syncId}, fetched ${result.fetchedAt.toISOString()}).`
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`IRS EO BMF sync failed: ${error.message}`);
  process.exitCode = 1;
});