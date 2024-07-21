import {
  createHonoApp,
  setupErrorHandlers,
  setupHealthReporting,
  setupHonoListener,
  setupRouteLogger,
  setupRuntime,
  setupTrpcHandler
} from '@u22n/hono';
import { signatureMiddleware } from './postal-routes/signature-middleware';
import { inboundApi } from './postal-routes/inbound';
import { eventApi } from './postal-routes/events';
import { opentelemetry } from '@u22n/otel/hono';
import { trpcMailBridgeRouter } from './trpc';
import type { Ctx, TRPCContext } from './ctx';
import { db } from '@u22n/database';
import { env } from './env';

const processCleanup: Array<() => Promise<void>> = [];

if (env.MAILBRIDGE_MODE === 'dual' || env.MAILBRIDGE_MODE === 'handler') {
  const app = createHonoApp<Ctx>();
  app.use(opentelemetry('mail-bridge/hono'));

  setupRouteLogger(app, env.NODE_ENV === 'development');

  setupHealthReporting(app, {
    service: `Mail Bridge [${env.MAILBRIDGE_MODE === 'handler' ? 'Handler' : 'Dual'}]`
  });

  setupTrpcHandler(app, trpcMailBridgeRouter, (_, c) => {
    const authToken = c.req.header('Authorization');
    const isServiceAuthenticated = authToken === env.MAILBRIDGE_KEY;
    return {
      auth: isServiceAuthenticated,
      db,
      config: env,
      context: c
    } satisfies TRPCContext;
  });

  setupErrorHandlers(app);

  // Postal endpoints
  app.use('/postal/*', signatureMiddleware);
  app.route('/postal', eventApi);
  app.route('/postal', inboundApi);

  const cleanup = setupHonoListener(app, { port: env.PORT });
  processCleanup.push(cleanup);
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

setupRuntime(processCleanup);
