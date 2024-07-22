import { getTracer, inActiveSpan } from './helpers';
import { createMiddleware } from '@u22n/hono/helpers';

function formatHeaders(headers: Record<string, string> | Headers) {
  return Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
}

export function opentelemetry(name?: string) {
  const { startActiveSpan } = getTracer(name ?? 'hono');
  return createMiddleware<{ Variables: { requestId: string } }>((c, next) =>
    inActiveSpan(async (parent) => {
      parent?.updateName(`HTTP ${c.req.method} ${c.req.path}`);
      if (c.req.method === 'OPTIONS') return next();
      return startActiveSpan(`Hono Handler`, async (span) => {
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
}
