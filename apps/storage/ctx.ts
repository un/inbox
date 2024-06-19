import type { Otel } from '@u22n/otel/hono';

export type Ctx = {
  Variables: {
    otel: Otel;
    account: {
      id: number;
      session: any;
    } | null;
  };
};
