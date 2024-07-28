import {
  createHonoApp,
  setupCors,
  setupErrorHandlers,
  setupHealthReporting,
  setupHonoListener,
  setupRouteLogger,
  setupRuntime,
  setupTrpcHandler
} from '@u22n/hono';
import { authMiddleware, serviceMiddleware } from './middlewares';
import { realtimeApi } from './routes/realtime';
import { servicesApi } from './routes/services';
import { opentelemetry } from '@u22n/otel/hono';
import type { Ctx, TrpcContext } from './ctx';
import { trpcPlatformRouter } from './trpc';
import { authApi } from './routes/auth';
import { db } from '@u22n/database';
import { env } from './env';

const app = createHonoApp<Ctx>();

app.use(opentelemetry('platform/hono'));

setupRouteLogger(app, env.NODE_ENV === 'development');
setupCors(app, { origin: [env.WEBAPP_URL], exposeHeaders: ['Location'] });
setupHealthReporting(app, { service: 'Platform' });
setupErrorHandlers(app);

// Auth middleware
app.use('*', authMiddleware);

setupTrpcHandler(
  app,
  trpcPlatformRouter,
  (_, c) =>
    ({
      db,
      account: c.get('account'),
      org: null,
      event: c,
      selfHosted: !env.EE_LICENSE_KEY
    }) satisfies TrpcContext
);

// Routes
app.route('/auth', authApi);
app.route('/realtime', realtimeApi);
// Service Endpoints
app.use('/services/*', serviceMiddleware);
app.route('/services', servicesApi);

const cleanup = setupHonoListener(app, { port: env.PORT });
setupRuntime([cleanup]);
