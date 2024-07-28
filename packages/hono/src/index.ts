import type { HttpBindings } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { serve } from '@hono/node-server';
import { Hono, type Context } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

export type HonoContext<Variables = NonNullable<unknown>> = {
  Variables: Variables;
  Bindings: HttpBindings;
};

export const createHonoApp = <T extends HonoContext>() => new Hono<T>();

// eslint-disable-next-line @typescript-eslint/ban-types
type CorsOptions = Parameters<typeof cors>[0] & {};

export const setupRouteLogger = <T extends HonoContext>(
  app: Hono<T>,
  enabled = true
) => (enabled ? app.use(logger()) : app);

export const setupCors = <T extends HonoContext>(
  app: Hono<T>,
  corsOptions: CorsOptions
) =>
  app.use(
    '*',
    cors({
      credentials: true,
      ...corsOptions
    })
  );

type HealthReportingOptions = {
  service: string;
  endpoint?: `/${string}`;
};

export const setupHealthReporting = <T extends HonoContext>(
  app: Hono<T>,
  { service, endpoint }: HealthReportingOptions
) =>
  app.get(endpoint ?? '/health', (c) => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    return c.json({
      service,
      uptime,
      memoryUsage
    });
  });

export const setupErrorHandlers = <T extends HonoContext>(app: Hono<T>) => {
  app.notFound((c) => c.json({ error: 'Route not found' }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Internal server error' }, 500);
  });
  return app;
};

type HonoListenerOptions = {
  port: number;
  hostname?: string;
};

export const setupHonoListener = <T extends HonoContext>(
  app: Hono<T>,
  { port, hostname }: HonoListenerOptions
) => {
  const server = serve(
    {
      fetch: app.fetch,
      port,
      hostname
    },
    () =>
      console.info(
        `Hono server listening at ${hostname ?? 'localhost'}:${port}`
      )
  );

  return () =>
    new Promise<void>((r) => {
      console.info('Shutting down Hono server...');
      server.close(() => r());
    });
};

type TrpcServerOptions = Parameters<typeof trpcServer>[0];
type AnyRouter = TrpcServerOptions['router'];
// eslint-disable-next-line @typescript-eslint/ban-types
type FetchOptions = Parameters<TrpcServerOptions['createContext'] & {}>[0];

export const setupTrpcHandler = <T extends HonoContext>(
  app: Hono<T>,
  router: AnyRouter,
  createContext?: (
    opts: FetchOptions,
    ctx: Context<T>
  ) => Record<string, unknown>
) =>
  app.use(
    '/trpc/*',
    trpcServer({
      router,
      createContext
    })
  );

export const setupRuntime = (
  cleanupFunctions: Array<() => Promise<void> | void>
) => {
  let closing = false;
  const handleExit = async () => {
    if (closing) return;
    closing = true;
    await Promise.allSettled(cleanupFunctions.map((fn) => fn()));
    process.exit();
  };

  process.on('unhandledRejection', (err) => console.error(err));
  process.on('uncaughtException', (err) => console.error(err));
  process.on('SIGINT', () => void handleExit());
  process.on('SIGTERM', () => void handleExit());
};
