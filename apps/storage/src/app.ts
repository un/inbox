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
import type { Ctx } from './ctx';

const app = new Hono<Ctx>();

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
app.get('/', (c) => c.json({ status: "I'm Alive 🏝️" }));

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

serve({
  fetch: app.fetch,
  port: env.PORT
}).on('listening', () => {
  console.info(`Server listening on port ${env.PORT}`);
});
