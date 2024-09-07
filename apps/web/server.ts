import { createHonoApp, setupHonoListener, setupRuntime } from '@u22n/hono';
import { createRequestHandler, type ServerBuild } from '@remix-run/node';
import { serveStatic } from '@u22n/hono/helpers';
import { readdir } from 'fs/promises';
import { resolve } from 'path';

const BUILD_PATH = resolve('./build/server/index.js');
const build = (await import(BUILD_PATH)) as ServerBuild;

const assets = await readdir('./build/client', { recursive: true }).then(
  (files) => files.map((file) => `/${file}`)
);

const app = createHonoApp();
const handler = createRequestHandler(build);

app
  .all('/ingest/:path{.+}', async (c) => {
    const path = c.req.param('path');
    const isStatic = path.startsWith('/static/');
    const res = await fetch(
      isStatic
        ? `https://us-assets.i.posthog.com/static/${path}`
        : `https://us.i.posthog.com/${path}`,
      {
        method: c.req.method,
        headers: c.req.raw.headers,
        body: c.req.raw.body,
        duplex: 'half'
      }
    );
    return c.body(res.body, res);
  })
  .use('*', async (c, next) => {
    if (assets.includes(c.req.path)) {
      c.header('Cache-Control', 'public, immutable, max-age=31536000');
      return serveStatic({ root: 'build/client' })(c, next);
    } else {
      return handler(c.req.raw);
    }
  });

const cleanup = setupHonoListener(app, {
  port: Number(process.env.PORT ?? 3000)
});

setupRuntime([cleanup]);
