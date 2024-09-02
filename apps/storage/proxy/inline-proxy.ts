import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { pendingAttachments } from '@u22n/database/schema';
import { sanitizeFilename } from '@u22n/utils/sanitizers';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { typeIdValidator } from '@u22n/utils/typeid';
import { zValidator } from '@u22n/hono/helpers';
import { checkSignedIn } from '../middlewares';
import { createHonoApp } from '@u22n/hono';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import type { Ctx } from '../ctx';
import { s3Client } from '../s3';
import { env } from '../env';
import { z } from 'zod';

export const inlineProxy = createHonoApp<Ctx>()
  .use(checkSignedIn)
  .get(
    '/:orgShortcode/:attachmentId/:filename',
    zValidator(
      'param',
      z.object({
        filename: z.string().transform(decodeURIComponent),
        attachmentId: typeIdValidator('convoAttachments'),
        orgShortcode: z.string()
      })
    ),
    async (c) => {
      const { filename, attachmentId, orgShortcode } = c.req.valid('param');

      const attachmentQueryResponse =
        await db.query.pendingAttachments.findFirst({
          where: eq(pendingAttachments.publicId, attachmentId),
          columns: {
            filename: true
          },
          with: {
            org: {
              columns: {
                shortcode: true,
                publicId: true
              },
              with: {
                members: {
                  columns: {
                    accountId: true
                  }
                }
              }
            }
          }
        });

      if (
        !attachmentQueryResponse ||
        sanitizeFilename(attachmentQueryResponse.filename) !==
          sanitizeFilename(filename) ||
        attachmentQueryResponse.org.shortcode !== orgShortcode ||
        !attachmentQueryResponse.org.members.find(
          (member) => member.accountId === c.get('account')?.id
        )
      ) {
        return c.json(
          { error: `Attachment ${filename} not found` },
          { status: 404 }
        );
      }

      const command = new GetObjectCommand({
        Bucket: env.STORAGE_S3_BUCKET_ATTACHMENTS,
        Key: `${attachmentQueryResponse.org.publicId}/${attachmentId}/${attachmentQueryResponse.filename}`
      });
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const res = await fetch(url);
      if (!res.ok) {
        return c.json(
          { error: 'Error while fetching attachment' },
          { status: 500 }
        );
      }
      // Cache for 1 hour
      c.header('Cache-Control', 'private, max-age=3600');
      return c.body(res.body, res);
    }
  );
