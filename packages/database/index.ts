import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { Client, Connection } from '@planetscale/database';
import { env } from './env';
import * as schema from './schema';
import { getTracer } from '@u22n/otel/helpers';

const databaseTracer = getTracer('database');

const originalExecute = Connection.prototype.execute;
Connection.prototype.execute = async function (
  query: string,
  args: any[] | null,
  options: any
) {
  return databaseTracer.startActiveSpan(`Database Query`, async (span) => {
    if (span) {
      span.addEvent('database.query.start');
      span.setAttribute('database.statement', query);
      if (args) {
        span.setAttribute(
          'database.values',
          args.map((v) => v.toString())
        );
      }
    }
    const result = await originalExecute
      .call(this, query, args, options)
      .catch((err) => {
        span?.recordException(err);
        throw err;
      });
    span?.addEvent('database.query.end');
    return result;
  });
};

const client = new Client({
  host: env.DB_PLANETSCALE_HOST,
  username: env.DB_PLANETSCALE_USERNAME,
  password: env.DB_PLANETSCALE_PASSWORD,
  fetch: (url, init) => {
    init && delete init.cache;
    const u = new URL(url);
    // set protocol to http if localhost for CI testing
    if (u.host.includes('localhost') || u.host.includes('127.0.0.1')) {
      u.protocol = 'http';
    }
    return fetch(u, init);
  }
});

const connectionOptions = {
  logger: false,
  schema
};

export const db = drizzle(client, connectionOptions);
export type DBType = typeof db;
