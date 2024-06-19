import './tracing';
import './queue/mail-processor';
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

const app = new Hono<Ctx>();
app.use(otel());

// Logger middleware
if (env.NODE_ENV === 'development') {
  app.use(logger());
}

// Health check endpoint
app.get('/', (c) => c.json({ status: "I'm Alive 🏝️" }));

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

// Development error handlers
if (env.NODE_ENV === 'development') {
  process.on('unhandledRejection', (err) => {
    console.error(err);
  });
  process.on('uncaughtException', (err) => {
    console.error(err);
  });
}

// Start server
serve({
  fetch: app.fetch,
  port: env.PORT
}).on('listening', () => {
  console.info(`Server listening on port ${env.PORT}`);
});

// Clean Exit
process.on('exit', () => {
  console.info('Shutting down...');
  process.exit(0);
});
