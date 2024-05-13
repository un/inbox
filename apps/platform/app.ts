import type { Ctx } from './ctx';
import { env } from './env';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { authApi } from './routes/auth';
import { realtimeApi } from './routes/realtime';
import { trpcPlatformRouter } from './trpc';
import { db } from '@u22n/database';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { authMiddleware } from './middlewares';
import { logger } from 'hono/logger';

const app = new Hono<Ctx>();

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
app.get('/', (c) => c.json({ status: "I'm Alive 🏝️" }));

// Routes
app.route('/auth', authApi);
app.route('/realtime', realtimeApi);

// TRPC handler
app.use('/trpc/*', async (c) =>
  fetchRequestHandler({
    router: trpcPlatformRouter,
    createContext: () => ({
      db,
      account: c.get('account'),
      org: null,
      event: c
    }),
    endpoint: '/trpc',
    req: c.req.raw
  }).then((res) => c.body(res.body, res))
);

// 404 handler
app.notFound((c) => c.json({ message: 'Not Found' }, 404));

serve({
  fetch: app.fetch,
  port: env.PORT
}).on('listening', () => {
  console.info(`Server listening on port ${env.PORT}`);
});
