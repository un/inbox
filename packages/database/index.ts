import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { Client } from '@planetscale/database';
import * as schema from './schema';

// const client = new Client({
//   host: process.env.DB_PLANETSCALE_HOST,
//   username: process.env.DB_PLANETSCALE_USERNAME,
//   password: process.env.DB_PLANETSCALE_PASSWORD,

//   fetch: (url: string, init: any) => {
//     (init as any).cache = undefined; // Remove cache header
//     const u = new URL(url);
//     // set protocol to http if localhost for CI testing
//     if (u.host.includes('localhost') || u.host.includes('127.0.0.1')) {
//       u.protocol = 'http';
//     }
//     return fetch(u, init);
//   }
// });

// const connectionOptions = {
//   logger: process.env.NODE_ENV === 'development' ? true : false,
//   schema
// };

// export const db = drizzle(client.connection(), connectionOptions);

function createDb() {
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

  return drizzle(client.connection(), connectionOptions);
}

export const db = new Proxy(
  {},
  {
    get: (target, prop: string | symbol) => {
      const dbInstance = createDb();
      return (dbInstance as any)[prop];
    }
  }
) as DBType;
export type DBType = ReturnType<typeof createDb>;
