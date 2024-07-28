import {
  createHonoApp,
  setupCors,
  setupErrorHandlers,
  setupHealthReporting,
  setupHonoListener,
  setupRouteLogger,
  setupRuntime
} from '@u22n/hono';
import { deleteAttachmentsApi } from './api/deleteAttachments';
import { internalPresignApi } from './api/internalPresign';
import { attachmentProxy } from './proxy/attachment';
import { opentelemetry } from '@u22n/otel/hono';
import { mailfetchApi } from './api/mailfetch';
import { authMiddleware } from './middlewares';
import { avatarProxy } from './proxy/avatars';
import { presignApi } from './api/presign';
import { avatarApi } from './api/avatar';
import type { Ctx } from './ctx';
import { env } from './env';

const app = createHonoApp<Ctx>();

app.use(opentelemetry('storage/hono'));

setupRouteLogger(app, env.NODE_ENV === 'development');
setupCors(app, { origin: [env.WEBAPP_URL] });
setupHealthReporting(app, { service: 'Storage' });
setupErrorHandlers(app);

// Auth middleware
app.use('*', authMiddleware);
// Proxies
app.route('/avatar', avatarProxy);
app.route('/attachment', attachmentProxy);

// APIs
app.route('/api', avatarApi);
app.route('/api', presignApi);
app.route('/api', internalPresignApi);
app.route('/api', mailfetchApi);
app.route('/api', deleteAttachmentsApi);

const cleanup = setupHonoListener(app, { port: env.PORT });
setupRuntime([cleanup]);
