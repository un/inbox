import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { checkAuthorizedService } from '../middlewares';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { zValidator } from '@u22n/hono/helpers';
import { createHonoApp } from '@u22n/hono';
import type { Ctx } from '../ctx';
import { s3Client } from '../s3';
import { env } from '../env';
import { z } from 'zod';

export const internalPresignApi = createHonoApp<Ctx>().post(
  '/attachments/internalPresign',
  checkAuthorizedService,
  zValidator(
    'json',
    z.object({
      orgPublicId: z.string(),
      filename: z.string()
    })
  ),
  async (c) => {
    const { filename, orgPublicId } = c.req.valid('json');
    const attachmentPublicId = typeIdGenerator('convoAttachments');

    const command = new PutObjectCommand({
      Bucket: env.STORAGE_S3_BUCKET_ATTACHMENTS,
      Key: `${orgPublicId}/${attachmentPublicId}/${filename}`
    });
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600
    });
    return c.json({ publicId: attachmentPublicId, signedUrl });
  }
);
