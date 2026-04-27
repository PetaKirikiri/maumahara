import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

/**
 * Drizzle Kit — migrations / introspection against Postgres (e.g. Supabase).
 * Set `DATABASE_URL` in `.env`. Runtime app uses Supabase JS + anon key.
 */
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:[YOUR-PASSWORD]@db.vuxeemwxdldfjybzgtxc.supabase.co:5432/postgres',
  },
} satisfies Config;
