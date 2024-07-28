import {
  createHonoApp,
  setupCors,
  setupErrorHandlers,
  setupHealthReporting,
  setupHonoListener,
  setupRuntime,
  setupTrpcHandler
} from '@u22n/hono';
import { stripeWebhookMiddleware } from './middlewares';
import { validateLicense } from './validateLicenseKey';
import { stripeApi } from './routes/stripe';
import { trpcBillingRouter } from './trpc';
import { stripeData } from './stripe';
import { db } from '@u22n/database';
import { type Ctx } from './ctx';
import { env } from './env';

await validateLicense();

const app = createHonoApp<Ctx>();
setupCors(app, { origin: env.WEBAPP_URL });
setupHealthReporting(app, { service: 'Billing' });
setupErrorHandlers(app);

setupTrpcHandler(app, trpcBillingRouter, (_, c) => {
  const authToken = c.req.header('Authorization');
  return {
    auth: authToken === env.BILLING_KEY,
    stripe: stripeData,
    db
  };
});

// Stripe webhook middleware & API
app.use('/stripe/*', stripeWebhookMiddleware);
app.route('/stripe', stripeApi);

const cleanup = setupHonoListener(app, { port: env.PORT });
setupRuntime([cleanup]);
