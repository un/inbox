import { activePostalServer, env } from '../env';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const isLocal = env.MAILBRIDGE_LOCAL_MODE;
export const connection = mysql.createPool({
  uri: isLocal
    ? // we actually don't use the db in local mode, it is set to the local docker db to avoid throwing connection errors
      env.DB_MYSQL_MIGRATION_URL
    : `${activePostalServer.dbConnectionString}/postal`,
  multipleStatements: true
});

export const postalDB = drizzle(connection, { schema, mode: 'default' });
