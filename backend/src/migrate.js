'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run migrations.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: true },
    max: 1,
  });

  try {
    const migration = await fs.readFile(
      path.join(__dirname, '..', 'migrations', '001_applications.sql'),
      'utf8'
    );
    await pool.query(migration);
    console.log('Database migration 001_applications.sql applied.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Database migration failed: ${error.message}`);
  process.exitCode = 1;
});
