import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

function createDb() {
  // Vercel's Neon integration sets DATABASE_URL (and POSTGRES_URL on older setups).
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Connect a Neon Postgres database to the Vercel project (Storage tab) and redeploy.'
    );
  }
  return drizzle(url, { schema });
}

let instance: ReturnType<typeof createDb> | null = null;

/** Lazily connects so a missing DATABASE_URL produces a clear error at request time. */
export function getDb() {
  if (!instance) instance = createDb();
  return instance;
}
