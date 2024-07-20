import './tracing';
import { env } from './env';
import { avatarProxy } from './proxy/avatars';
import { attachmentProxy } from './proxy/attachment';
import { authMiddleware } from './middlewares';
import { avatarApi } from './api/avatar';
import { presignApi } from './api/presign';
import { mailfetchApi } from './api/mailfetch';
import { internalPresignApi } from './api/internalPresign';
import { deleteAttachmentsApi } from './api/deleteAttachments';
import { otel } from '@u22n/otel/hono';
import type { Ctx } from './ctx';
import {
  createHonoApp,
  setupCors,
  setupErrorHandlers,
  setupHealthReporting,
  setupHonoListener,
  setupRouteLogger,
  setupRuntime
} from '@u22n/hono';

const app = createHonoApp<Ctx>();
app.use(otel());

setupRouteLogger(app, process.env.NODE_ENV === 'development');
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
