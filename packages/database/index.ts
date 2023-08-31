import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';
import * as schema from './schema';

// SELF: add support for non planetscale hosting via mysql2 package

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

export const db = drizzle(connection, connectionOptions);
export type DBType = typeof db;
