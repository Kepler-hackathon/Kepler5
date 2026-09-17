// Runs drizzle-kit migrations at container startup (used by infra/scripts/migrate.sh).
// Requires DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME env vars.
const { execSync } = require('child_process');
const path = require('path');
const { Pool } = require('pg');

function buildUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { DB_HOST, DB_PORT = '5432', DB_USER, DB_PASSWORD, DB_NAME = 'kepler' } = process.env;
  if (!DB_HOST || !DB_USER || !DB_PASSWORD) throw new Error('DB credentials not configured');
  return `postgres://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

async function waitForDb(url, retries = 10) {
  const pool = new Pool({ connectionString: url, ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : undefined });
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      await pool.end();
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`DB not ready (attempt ${i + 1}/${retries}), retrying in 3s...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function main() {
  const url = buildUrl();
  console.log('Waiting for database...');
  await waitForDb(url);
  console.log('Running migrations...');
  // drizzle-kit is in packages/db; run from there
  const dbPkg = path.resolve(__dirname, '../../packages/db');
  execSync(`DATABASE_URL="${url}" node_modules/.bin/drizzle-kit migrate`, {
    cwd: dbPkg,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
  console.log('Migrations complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
