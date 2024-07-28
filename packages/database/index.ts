import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { Client, Connection } from '@planetscale/database';
import { opentelemetryEnabled } from '@u22n/otel';
import * as schema from './schema';
import { env } from './env';

if (opentelemetryEnabled) {
  const { getTracer } = await import('@u22n/otel/helpers');
  const databaseTracer = getTracer('database');

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalExecute = Connection.prototype.execute;

  Connection.prototype.execute = async function (query, args, options) {
    return databaseTracer.startActiveSpan(`Database Query`, async (span) => {
      if (span) {
        span.addEvent('database.query.start');
        span.setAttribute('database.statement', query);
        if (Array.isArray(args)) {
          span.setAttribute(
            'database.values',
            args.map((v: string) => v.toString())
          );
        }
      }
      const result = await originalExecute
        // @ts-expect-error, don't care about types here
        .call(this, query, args, options)
        .catch((err: Error) => {
          span?.recordException(err);
          throw err;
        });
      span?.addEvent('database.query.end');
      return result;
    });
  };
}

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
