import type { Ctx } from '../ctx';
import { checkAuthorizedService } from '../middlewares';
import { z } from 'zod';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../s3';
import { env } from '../env';
import { createHonoApp } from '@u22n/hono';
import { zValidator } from '@u22n/hono/helpers';

export const mailfetchApi = createHonoApp<Ctx>().post(
  '/attachments/mailfetch',
  checkAuthorizedService,
  zValidator(
    'json',
    z.object({
      orgPublicId: z.string(),
      attachmentPublicId: z.string(),
      filename: z.string()
    })
  ),
  async (c) => {
    const { orgPublicId, attachmentPublicId, filename } = c.req.valid('json');
    const command = new GetObjectCommand({
      Bucket: env.STORAGE_S3_BUCKET_ATTACHMENTS,
      Key: `${orgPublicId}/${attachmentPublicId}/${filename}`
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    return c.json({ url });
  }
);
