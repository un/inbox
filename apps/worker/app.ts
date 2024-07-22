import type { Ctx } from './ctx';
import { env } from './env';
import { commandControlAuthMiddleware } from './middlewares';
import { opentelemetry } from '@u22n/otel/hono';
import { sessionCleanupCronJob } from './services/expired-session-cleanup';
import { dnsCheckWorker, masterCronJob } from './services/dns-check-queue';
import { jobsRouter } from './trpc/routers/jobs-router';
import {
  createHonoApp,
  setupErrorHandlers,
  setupHealthReporting,
  setupHonoListener,
  setupRouteLogger,
  setupRuntime,
  setupTrpcHandler
} from '@u22n/hono';

const app = createHonoApp<Ctx>();
app.use(opentelemetry('worker/hono'));

setupRouteLogger(app, env.NODE_ENV === 'development');
setupHealthReporting(app, { service: 'Worker' });
setupErrorHandlers(app);

// Auth middleware
app.use('*', commandControlAuthMiddleware);

setupTrpcHandler(app, jobsRouter);
const cleanup = setupHonoListener(app, { port: env.PORT });

setupRuntime([
  cleanup,
  () => dnsCheckWorker.close(),
  () => sessionCleanupCronJob.stop(),
  () => masterCronJob.stop()
]);
