import type { Context } from '@u22n/hono/helpers';
import type { HonoContext } from '@u22n/hono';
import type { db } from '@u22n/database';
import type { env } from './env';

export type Ctx = HonoContext;

export type TRPCContext = {
  auth: boolean;
  db: typeof db;
  config: typeof env;
  context: Context<Ctx>;
};
