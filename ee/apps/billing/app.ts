import {
  createHonoApp,
  setupCors,
  setupErrorHandlers,
  setupHealthReporting,
  setupHonoListener,
  setupRuntime,
  setupTrpcHandler,
  setupRouteLogger
} from '@u22n/hono';
import { stripeWebhookMiddleware } from './middlewares';
import { validateLicense } from './validateLicenseKey';
import { stripeApi } from './routes/stripe';
import { trpcBillingRouter } from './trpc';
import { stripeData } from './stripe';
import { db } from '@u22n/database';
import { type Ctx } from './ctx';
import { timingSafeEqual, createHash } from 'crypto';
import { env } from './env';

function safeEqual(a: string, b: string): boolean {
  try {
    const hashA = createHash('sha256').update(a).digest();
    const hashB = createHash('sha256').update(b).digest();
    return timingSafeEqual(hashA, hashB);
  } catch {
    return false;
  }
}

await validateLicense();

const app = createHonoApp<Ctx>();
setupRouteLogger(app, env.NODE_ENV === 'development');
setupCors(app, { origin: env.WEBAPP_URL });
setupHealthReporting(app, { service: 'Billing' });
setupErrorHandlers(app);

setupTrpcHandler(app, trpcBillingRouter, (_, c) => {
  const authToken = c.req.header('Authorization');
  return {
    auth: authToken ? safeEqual(authToken, env.BILLING_KEY) : false,
    stripe: stripeData,
    db
  };
});

// Stripe webhook middleware & API
app.use('/stripe/*', stripeWebhookMiddleware);
app.route('/stripe', stripeApi);

const cleanup = setupHonoListener(app, { port: env.PORT });
setupRuntime([cleanup]);
