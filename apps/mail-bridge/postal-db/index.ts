import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { useRuntimeConfig } from '#imports';
import type { PostalConfig } from '../types';

const postalConfig = useRuntimeConfig().postal as PostalConfig;

const isLocal = postalConfig.localMode;
export const connection = await mysql.createConnection({
  uri: isLocal
    ? // we actually don't use the db in local mode, it is set to the local docker db to avoid throwing connection errors
      process.env.DB_MYSQL_MIGRATION_URL
    : `${(useRuntimeConfig().postal as any).activeServers.dbConnectionString}/postal`,
  multipleStatements: true
});

export const postalDB = drizzle(connection, { schema, mode: 'default' });
