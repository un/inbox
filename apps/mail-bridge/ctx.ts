import type { db } from '@u22n/database';
import type { Otel } from '@u22n/otel/hono';
import type { env } from './env';
import type { Context } from '@u22n/hono/helpers';
import type { HonoContext } from '@u22n/hono';

export type Ctx = HonoContext<{
  otel: Otel;
}>;

export type TRPCContext = {
  auth: boolean;
  db: typeof db;
  config: typeof env;
  context: Context<Ctx>;
};
