import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { useRuntimeConfig } from '#imports';

export const connection = await mysql.createConnection({
  uri: `${useRuntimeConfig().postal.activeServers.dbConnectionString}/postal`,
  multipleStatements: true
});

export const postalDB = drizzle(connection, { schema, mode: 'default' });
