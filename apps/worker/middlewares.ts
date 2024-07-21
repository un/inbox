import { createMiddleware } from '@u22n/hono/helpers';
import { getTracer } from '@u22n/otel/helpers';
import { logger } from '@u22n/otel/logger';
import type { Ctx } from './ctx';
import { env } from './env';

const middlewareTracer = getTracer('worker/hono/middleware');

export const commandControlAuthMiddleware = createMiddleware<Ctx>(
  async (c, next) =>
    middlewareTracer.startActiveSpan('Service Middleware', async (span) => {
      const authToken = c.req.header('Authorization');
      span?.setAttribute('req.service.meta.has_header', !!authToken);
      if (authToken !== env.WORKER_ACCESS_KEY) {
        const ip = c.env.incoming.socket.remoteAddress;
        logger.info(
          `Unauthorized Request from ${ip}\n Path: ${c.req.path}\nHeaders: ${JSON.stringify(c.req.header())}`
        );
        return c.json({ error: 'Unauthorized' }, 400);
      }
      await next();
    })
);
