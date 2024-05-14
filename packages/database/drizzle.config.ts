import type { Config } from 'drizzle-kit';
import { env } from './env';

export default {
  schema: './schema.ts',
  out: './migrations',
  dialect: 'mysql',
  dbCredentials: {
    url: env.DB_MYSQL_MIGRATION_URL
  }
} satisfies Config;
