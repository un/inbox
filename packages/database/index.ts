import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { Client } from '@planetscale/database';
import * as schema from './schema';

const client = new Client({
  host: process.env.DB_PLANETSCALE_HOST,
  username: process.env.DB_PLANETSCALE_USERNAME,
  password: process.env.DB_PLANETSCALE_PASSWORD,

  fetch: (url: string, init: any) => {
    (init as any).cache = undefined; // Remove cache header
    const u = new URL(url);
    // set protocol to http if localhost for CI testing
    if (u.host.includes('localhost') || u.host.includes('127.0.0.1')) {
      u.protocol = 'http';
    }
    return fetch(u, init);
  }
});

const connectionOptions = {
  logger: process.env.NODE_ENV === 'development' ? true : false,
  schema
};
//@ts-expect-error - remove after merge of https://github.com/drizzle-team/drizzle-orm/pull/1801
export const db = drizzle(client, connectionOptions);
export type DBType = typeof db;
