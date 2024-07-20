import type { HonoContext } from '@u22n/hono';
import type { Otel } from '@u22n/otel/hono';

export type Ctx = HonoContext<{
  otel: Otel;
  account: {
    id: number;
    session: any;
  } | null;
}>;
