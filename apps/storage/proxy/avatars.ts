import { createHonoApp } from '@u22n/hono';
import type { Ctx } from '../ctx';
import { env } from '../env';

// Proxy to `${process.env.STORAGE_S3_ENDPOINT}/${process.env.STORAGE_S3_BUCKET_AVATARS}/${proxy}`
export const avatarProxy = createHonoApp<Ctx>().get(
  '/:proxy{.+}',
  async (c) => {
    const proxy = c.req.param('proxy');
    const res = await fetch(
      `${env.STORAGE_S3_ENDPOINT}/${env.STORAGE_S3_BUCKET_AVATARS}/${proxy}`
    );
    if (res.status === 404) {
      return c.json({ error: 'Not Found' }, 404);
    }
    // Avatars are immutable so we can cache them for a long time
    c.header(
      'Cache-Control',
      'public, immutable, max-age=86400, stale-while-revalidate=604800'
    );
    return c.body(res.body, res);
  }
);
