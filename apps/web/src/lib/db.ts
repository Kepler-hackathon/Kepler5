import postgres from 'postgres';

let sql: postgres.Sql | undefined;

export function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { DB_HOST, DB_PORT = '5432', DB_USER, DB_PASSWORD, DB_NAME = 'kepler' } = process.env;
  if (!DB_HOST || !DB_USER || !DB_PASSWORD) throw new Error('database credentials are not configured');
  return `postgres://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

function getSql(): postgres.Sql {
  if (!sql) {
    sql = postgres(databaseUrl(), {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
      ssl: process.env.DB_HOST ? 'require' : undefined,
    });
  }
  return sql;
}

export function getPool() {
  const client = getSql();
  return {
    async query<T extends Record<string, unknown>>(queryText: string): Promise<{ rows: T[] }> {
      const rows = (await client.unsafe(queryText)) as T[];
      return { rows };
    },
  };
}
