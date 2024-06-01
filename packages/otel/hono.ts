import type { Context as HonoContext } from 'hono';
import { createMiddleware } from 'hono/factory';
import { trace, type Tracer } from '@opentelemetry/api';

export type Otel = {
  tracer: Tracer;
};

type HonoEnvContext = {
  Variables: {
    otel: Otel;
  };
};

const formatRequest = (req: HonoContext<HonoEnvContext>['req']) => ({
  'req.headers': JSON.stringify(req.header()),
  'req.query': JSON.stringify(req.query())
});

const formatError = (error: Error) => ({
  'error.name': error.name,
  'error.message': error.message,
  'error.stack': error.stack
});

const formatResponse = (res: HonoContext<HonoEnvContext>['res']) => ({
  'res.status': res.status,
  'res.headers': JSON.stringify(res.headers)
});

export const otel = () => {
  const tracer = trace.getTracer('hono');
  const openTelemetryMiddleware = createMiddleware<HonoEnvContext>(
    async (c, next) => {
      trace
        .getActiveSpan()
        ?.updateName(`HTTP Request ${c.req.method} ${c.req.path}`);
      if (c.req.method === 'OPTIONS') return next();

      return tracer.startActiveSpan(`Hono Handler`, async (span) => {
        span.setAttributes(formatRequest(c.req));
        c.set('otel', { tracer });
        await next().catch((e) => {
          if (e instanceof Error) span.setAttributes(formatError(e));
        });
        if (c.error) span.setAttributes(formatError(c.error));
        span.setAttributes(formatResponse(c.res));
        span.end();
      });
    }
  );

  return openTelemetryMiddleware;
};
