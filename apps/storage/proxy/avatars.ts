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
    ).then((res) => c.body(res.body, res));
    if (res.status === 404) {
      return c.json({ error: 'Not Found' }, 404);
    }
    return res;
  }
);
