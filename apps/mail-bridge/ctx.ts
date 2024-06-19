import type { db } from '@u22n/database';
import type { Otel } from '@u22n/otel/hono';
import type { env } from './env';
import type { Context } from 'hono';

export type Ctx = {
  Variables: {
    otel: Otel;
  };
};

export type TRPCContext = {
  auth: boolean;
  db: typeof db;
  config: typeof env;
  context: Context<Ctx>;
};
