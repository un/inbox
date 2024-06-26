import './tracing';
import { env } from './env';
import { Hono } from 'hono';
import { db } from '@u22n/database';
import { serve } from '@hono/node-server';
import { trpcMailBridgeRouter } from './trpc';
import { trpcServer } from '@hono/trpc-server';
import { eventApi } from './postal-routes/events';
import { inboundApi } from './postal-routes/inbound';
import { signatureMiddleware } from './postal-routes/signature-middleware';
import { logger } from 'hono/logger';
import { otel } from '@u22n/otel/hono';
import type { Ctx, TRPCContext } from './ctx';

const processCleanup: Array<() => Promise<void>> = [];

if (env.MAILBRIDGE_MODE === 'dual' || env.MAILBRIDGE_MODE === 'handler') {
  const app = new Hono<Ctx>();
  app.use(otel());

  // Logger middleware
  if (env.NODE_ENV === 'development') {
    app.use(logger());
  }

  // Health check endpoint
  app.get('/health', (c) => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    return c.json({
      service: `Mail Bridge [${env.MAILBRIDGE_MODE === 'handler' ? 'Handler' : 'Dual'}]`,
      memoryUsage,
      uptime
    });
  });

  // TRPC handler
  app.use(
    '/trpc/*',
    trpcServer({
      router: trpcMailBridgeRouter,
      createContext: (_, c) => {
        const authToken = c.req.header('Authorization');
        const isServiceAuthenticated = authToken === env.MAILBRIDGE_KEY;
        return {
          auth: isServiceAuthenticated,
          db,
          config: env,
          context: c
        } satisfies TRPCContext;
      }
    })
  );

  // Postal endpoints
  app.use('/postal/*', signatureMiddleware);
  app.route('/postal', eventApi);
  app.route('/postal', inboundApi);

  // 404 handler
  app.notFound((c) => c.json({ message: 'Not Found' }, 404));

  // Global error handler
  app.onError((err, c) => {
    console.error(err);
    return c.json({ message: 'Something went wrong' }, 500);
  });

  // Start server
  const server = serve(
    {
      fetch: app.fetch,
      port: env.PORT
    },
    () =>
      console.info(`Starting mail-bridge handler server on port ${env.PORT}`)
  );

  processCleanup.push(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          console.info('Shutting down mail-bridge handler server');
          resolve();
        });
      })
  );
}

if (env.MAILBRIDGE_MODE === 'dual' || env.MAILBRIDGE_MODE === 'worker') {
  const { worker } = await import('./queue/mail-processor/worker');

  console.info('Starting mail-bridge worker');

  worker.on('error', (err) => console.error('[Worker] Error: ', err));

  processCleanup.push(async () => {
    console.info('Shutting down mail-bridge worker');
    await worker.close();
  });
}

// Handle uncaught errors
process.on('unhandledRejection', (err) => console.error(err));
process.on('uncaughtException', (err) => console.error(err));

const handleExit = async () => {
  await Promise.allSettled(processCleanup.map((fn) => fn()));
  process.exit();
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
