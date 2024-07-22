import { type Ctx } from './ctx';
import { env } from './env';
import { stripeWebhookMiddleware } from './middlewares';
import { stripeApi } from './routes/stripe';
import { trpcBillingRouter } from './trpc';
import { db } from '@u22n/database';
import { stripeData } from './stripe';
import { validateLicense } from './validateLicenseKey';
import {
  createHonoApp,
  setupCors,
  setupErrorHandlers,
  setupHealthReporting,
  setupHonoListener,
  setupRuntime,
  setupTrpcHandler
} from '@u22n/hono';

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
