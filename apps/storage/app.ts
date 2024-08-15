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
import { inlineProxy } from './proxy/inline-proxy';
import { deleteOrgsApi } from './api/deleteOrg';
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
app.route('/inline-proxy', inlineProxy);

// APIs
app.route('/api', avatarApi);
app.route('/api', presignApi);
app.route('/api', internalPresignApi);
app.route('/api', mailfetchApi);
app.route('/api', deleteAttachmentsApi);
app.route('/api', deleteOrgsApi);

const cleanup = setupHonoListener(app, { port: env.PORT });
setupRuntime([cleanup]);
