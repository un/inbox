import { Hono } from 'hono';
import { env } from '../env';
import type { Ctx } from '../ctx';

// Proxy to `${process.env.STORAGE_S3_ENDPOINT}/${process.env.STORAGE_S3_BUCKET_AVATARS}/${proxy}`
export const avatarProxy = new Hono<Ctx>().get('/:proxy{.+}', async (c) => {
  const proxy = c.req.param('proxy');
  const res = await fetch(
    `${env.STORAGE_S3_ENDPOINT}/${env.STORAGE_S3_BUCKET_AVATARS}/${proxy}`
  );
  if (res.status === 404) {
    return c.json({ error: 'Not Found' }, { status: 404 });
  }
  // Copy response as fetch headers are immutable
  return new Response(res.body, res);
});
