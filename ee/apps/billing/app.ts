import { type Ctx } from './ctx';
import { env } from './env';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { stripeWebhookMiddleware } from './middlewares';
import { stripeApi } from './routes/stripe';
import { trpcBillingRouter } from './trpc';
import { trpcServer } from '@hono/trpc-server';
import { db } from '@u22n/database';
import { stripeData } from './stripe';
import { validateLicense } from './validateLicenseKey';

await validateLicense();

const app = new Hono<Ctx>();

// CORS middleware
app.use(
  '*',
  cors({
    origin: env.WEBAPP_URL,
    credentials: true
  })
);

// Health check endpoint
app.get('/', (c) => c.json({ status: "I'm Alive 🏝️" }));

// Stripe webhook middleware & API
app.use('/stripe/*', stripeWebhookMiddleware);
app.route('/stripe', stripeApi);

// TRPC handler
app.use(
  '/trpc/*',
  trpcServer({
    router: trpcBillingRouter,
    createContext: (_, c) => {
      const authToken = c.req.header('Authorization');
      return {
        auth: authToken === env.BILLING_KEY,
        stripe: stripeData,
        db
      };
    }
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
