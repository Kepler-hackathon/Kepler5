import { Pool } from 'pg';

/**
 * Postgres pool for the Fargate app (backend-plan.md §14.13 row 174: max 10 per task).
 * The task definition injects DB_HOST/DB_PORT/DB_USER/DB_PASSWORD from the Aurora secret and
 * DB_NAME as plain env; DATABASE_URL is honoured for local development.
 */
let pool: Pool | undefined;

export function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { DB_HOST, DB_PORT = '5432', DB_USER, DB_PASSWORD, DB_NAME = 'kepler' } = process.env;
  if (!DB_HOST || !DB_USER || !DB_PASSWORD) throw new Error('database credentials are not configured');
  return `postgres://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}
