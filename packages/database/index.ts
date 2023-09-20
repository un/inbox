import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';
import * as schema from './schema';

// SELF: add support for non planetscale hosting via mysql2 package
//! SELF: When adding support for mysql2, we need to find a way to return the Insert IDs. Planetscale driver handles this automatically, but mysql2 dosnt and may need all DB inserts to be modified as a transaction with "LAST_INSERT_ID" being returned.

// create the connection
const connection = connect({
  host: process.env['DB_HOST'],
  username: process.env['DB_USERNAME'],
  password: process.env['DB_PASSWORD']
});

const connectionOptions = {
  logger: process.env.NODE_ENV === 'development' ? true : false,
  schema
};

export const db = {
  read: drizzle(connection, connectionOptions),
  write: drizzle(connection, connectionOptions)
};
export type DBType = typeof db;
