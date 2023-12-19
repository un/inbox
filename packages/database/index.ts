import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';
import type { Config } from '@planetscale/database';
import * as schema from './schema';

const planetscaleMode: 'local' | 'remote' =
  (process.env.DB_PLANETSCALE_MODE as any) || 'remote';
const connectionConfig: Config =
  planetscaleMode === 'local'
    ? {
        url: `http://root:unsedPassword@localhost:3900`
      }
    : {
        host: process.env['DB_PLANETSCALE_HOST'],
        username: process.env['DB_PLANETSCALE_USERNAME'],
        password: process.env['DB_PLANETSCALE_PASSWORD']
      };

const connection = connect(connectionConfig);

const connectionOptions = {
  logger: process.env.NODE_ENV === 'development' ? true : false,
  schema
};

export const db = drizzle(connection, connectionOptions);
export type DBType = typeof db;
