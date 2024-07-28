import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { checkAuthorizedService } from '../middlewares';
import { zValidator } from '@u22n/hono/helpers';
import { createHonoApp } from '@u22n/hono';
import type { Ctx } from '../ctx';
import { s3Client } from '../s3';
import { env } from '../env';
import { z } from 'zod';

export const deleteAttachmentsApi = createHonoApp<Ctx>().post(
  '/attachments/deleteAttachments',
  checkAuthorizedService,
  zValidator(
    'json',
    z.object({
      attachments: z.string().array()
    })
  ),
  async (c) => {
    const { attachments } = c.req.valid('json');
    const attachmentKeys = attachments.map((attachment) => ({
      Key: attachment
    }));
    const command = new DeleteObjectsCommand({
      Bucket: env.STORAGE_S3_BUCKET_ATTACHMENTS,
      Delete: {
        Objects: attachmentKeys
      }
    });

    await s3Client.send(command).catch((err: Error) => {
      console.error('Error while deleting some attachments', {
        attachments,
        err
      });
    });

    return c.json({ message: 'ok' });
  }
);
