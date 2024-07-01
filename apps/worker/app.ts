import './tracing';
import type { Ctx } from './ctx';
import { env } from './env';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { commandControlAuthMiddleware } from './middlewares';
import { otel } from '@u22n/otel/hono';
import { logger } from 'hono/logger';
import { sessionCleanupCronJob } from './services/expired-session-cleanup';
import { dnsCheckWorker, masterCronJob } from './services/dns-check-queue';
import { trpcServer } from '@hono/trpc-server';
import { jobsRouter } from './trpc/routers/jobs-router';

const app = new Hono<Ctx>();
app.use(otel());

// Logger middleware
if (env.NODE_ENV === 'development') {
  app.use(logger());
}

// Auth middleware
app.use('*', commandControlAuthMiddleware);

// Health check endpoint
app.get('/', (c) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  return c.json({
    service: `App Worker`,
    memoryUsage,
    uptime
  });
});

// TRPC handler
app.use(
  '/trpc/*',
  trpcServer({
    router: jobsRouter
  })
);

// 404 handler
app.notFound((c) => c.json({ message: 'Not Found' }, 404));

// Global error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ message: 'Something went wrong' }, 500);
});

// Handle uncaught errors
process.on('unhandledRejection', (err) => console.error(err));
process.on('uncaughtException', (err) => console.error(err));

// Start server
const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT
  },
  () => console.info(`Server listening on port ${env.PORT}`)
);

// Handle graceful shutdown
const handleExit = async () =>
  Promise.allSettled([
    await dnsCheckWorker.close(),
    sessionCleanupCronJob.stop(),
    masterCronJob.stop(),
    new Promise<void>((resolve) => server.close(() => resolve()))
  ]).then(() => {
    console.info('Shutting down...');
    process.exit();
  });

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
