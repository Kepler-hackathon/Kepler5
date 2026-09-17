import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Connection is lazy — postgres.js connects on first query, not at import time.
// DATABASE_URL must be set at runtime; queries fail fast if it is missing.
export const db = drizzle(postgres(process.env.DATABASE_URL!, { max: 10 }), { schema })
