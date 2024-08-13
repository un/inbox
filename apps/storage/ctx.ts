import type { HonoContext } from '@u22n/hono';
import type { Session } from './storage';

export type Ctx = HonoContext<{
  account: {
    id: number;
    session: Session;
  } | null;
}>;
