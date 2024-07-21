import type { HonoContext } from '@u22n/hono';

export type Ctx = HonoContext<{
  account: {
    id: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: any;
  } | null;
}>;
