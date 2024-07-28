import { createMiddleware } from '@u22n/hono/helpers';
import { getTracer, inActiveSpan } from './helpers';

function formatHeaders(headers: Record<string, string> | Headers) {
  return Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
}

export const opentelemetry = (name?: string) => {
  const tracer = getTracer(name ?? 'hono');
  return createMiddleware<{ Variables: { requestId: string } }>((c, next) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    inActiveSpan(async (parent) => {
      parent?.updateName(`HTTP ${c.req.method} ${c.req.path}`);
      if (c.req.method === 'OPTIONS') return next();
      return tracer.startActiveSpan(`Hono Handler`, async (span) => {
        span?.addEvent('hono.start');
        span?.setAttributes({
          'hono.req.headers': formatHeaders(c.req.header())
        });
        await next().catch((e) => {
          if (e instanceof Error) span?.recordException(e);
          throw e;
        });
        span?.setAttributes({
          'hono.res.status': c.res.status,
          'hono.res.headers': formatHeaders(c.res.headers)
        });
        span?.addEvent('hono.end');
      });
    })
  );
};
