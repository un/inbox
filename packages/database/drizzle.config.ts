// This file is only used for DrizzleKit migrations

import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default {
  schema: './schema.ts',
  out: './migrations',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DB_MYSQL_MIGRATION_URL!
  }
} satisfies Config;
