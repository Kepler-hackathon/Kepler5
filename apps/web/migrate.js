// Entry point for infra/scripts/migrate.sh (backend-plan.md §13: migrations as a one-off ECS task).
// Build step 1 replaces the body with `drizzle-kit migrate` (packages/db). Until then it only
// proves the task can start and reach Postgres, so the deploy pipeline is exercised end to end.
const { Pool } = require('pg');

async function main() {
  const { DB_HOST, DB_PORT = '5432', DB_USER, DB_PASSWORD, DB_NAME = 'kepler' } = process.env;
  const connectionString =
    process.env.DATABASE_URL ??
    `postgres://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  const pool = new Pool({ connectionString, ssl: DB_HOST ? { rejectUnauthorized: false } : undefined });
  const { rows } = await pool.query('select version()');
  console.log('connected:', rows[0].version);
  console.log('TODO(build step 1): run drizzle-kit migrate here');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
