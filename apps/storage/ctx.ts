import type { HonoContext } from '@u22n/hono';

export type Ctx = HonoContext<{
  account: {
    id: number;
    session: any;
  } | null;
}>;
