// This file is only used for DrizzleKit migrations

import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default {
  schema: './schema.ts',
  out: './migrations',
  driver: 'mysql2',
  dbCredentials: {
    connectionString: process.env['DB_MYSQL_MIGRATION_URL']!
  }
} satisfies Config;
