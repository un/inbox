import type { HttpBindings } from '@hono/node-server';

export type Ctx = {
  Bindings: HttpBindings;
  Variables: {};
};
