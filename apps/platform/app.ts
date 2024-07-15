import './tracing';
import type { Ctx, TrpcContext } from './ctx';
import { env } from './env';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { authApi } from './routes/auth';
import { realtimeApi } from './routes/realtime';
import { trpcPlatformRouter } from './trpc';
import { db } from '@u22n/database';
import { trpcServer } from '@hono/trpc-server';
import { authMiddleware, serviceMiddleware } from './middlewares';
import { otel } from '@u22n/otel/hono';
import { logger } from 'hono/logger';
import { servicesApi } from './routes/services';

const app = new Hono<Ctx>();
app.use(otel());

// Logger middleware
if (env.NODE_ENV === 'development') {
  app.use(logger());
}

// CORS middleware
app.use(
  '*',
  cors({
    origin: env.WEBAPP_URL,
    credentials: true,
    exposeHeaders: ['Location']
  })
);

// Auth middleware
app.use('*', authMiddleware);

// Health check endpoint
app.get('/health', (c) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  return c.json({
    service: `Platform`,
    memoryUsage,
    uptime
  });
});

// Routes
app.route('/auth', authApi);
app.route('/realtime', realtimeApi);

// Service Endpoints
app.use('/services/*', serviceMiddleware);
app.route('/services', servicesApi);

// TRPC handler
app.use(
  '/trpc/*',
  trpcServer({
    router: trpcPlatformRouter,
    createContext: (_, c) =>
      ({
        db,
        account: c.get('account'),
        org: null,
        event: c,
        selfHosted: !env.EE_LICENSE_KEY
      }) satisfies TrpcContext
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

// Clean Exit
const handleExit = () => {
  server.close(() => {
    console.info('Shutting down...');
    process.exit();
  });
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
