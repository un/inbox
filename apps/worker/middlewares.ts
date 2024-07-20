import { env } from './env';
import type { Ctx } from './ctx';
import { createMiddleware } from '@u22n/hono/helpers';

export const commandControlAuthMiddleware = createMiddleware<Ctx>(
  async (c, next) => {
    const authToken = c.req.header('Authorization');
    if (authToken !== env.WORKER_ACCESS_KEY) {
      const ip = c.env.incoming.socket.remoteAddress;
      console.info(
        `Unauthorized Request from ${ip}\n Path: ${c.req.path}\nHeaders: ${JSON.stringify(c.req.header())}`
      );
      return c.text('Unauthorized', 400);
    }
    await next();
  }
);
