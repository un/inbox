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
    return databaseTracer.startActiveSpan(`Database Call`, async (span) => {
      if (span) {
        span.addEvent('db.call.start');
        span.setAttribute('db.statement', query);
        if (Array.isArray(args)) {
          span.setAttribute(
            'db.values',
            args.map((v: string | null | number) => {
              if (v === null) return 'null';
              if (typeof v === 'undefined') return 'undefined';
              return v?.toString?.() ?? 'Unknown';
            })
          );
        }
      }
      const result = await originalExecute
        // @ts-expect-error, don't care about types here
        .call(this, query, args, options);
      span?.addEvent('db.call.end');
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

export const db = drizzle(client, { schema });
export type DBType = typeof db;
