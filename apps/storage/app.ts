import './tracing';
import { env } from './env';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { avatarProxy } from './proxy/avatars';
import { attachmentProxy } from './proxy/attachment';
import { authMiddleware } from './middlewares';
import { avatarApi } from './api/avatar';
import { presignApi } from './api/presign';
import { mailfetchApi } from './api/mailfetch';
import { internalPresignApi } from './api/internalPresign';
import { deleteAttachmentsApi } from './api/deleteAttachments';
import { logger } from 'hono/logger';
import { otel } from '@u22n/otel/hono';
import type { Ctx } from './ctx';

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
    credentials: true
  })
);

// Auth middleware
app.use('*', authMiddleware);

// Health check endpoint
app.get('/health', (c) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  return c.json({
    service: `Storage`,
    memoryUsage,
    uptime
  });
});

// Proxies
app.route('/avatar', avatarProxy);
app.route('/attachment', attachmentProxy);

// APIs
app.route('/api', avatarApi);
app.route('/api', presignApi);
app.route('/api', internalPresignApi);
app.route('/api', mailfetchApi);
app.route('/api', deleteAttachmentsApi);

// 404 handler
app.notFound((c) => c.json({ message: 'Route Not Found' }, 404));

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
