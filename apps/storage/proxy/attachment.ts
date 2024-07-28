import { convoAttachments, orgMembers, orgs } from '@u22n/database/schema';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { typeIdValidator } from '@u22n/utils/typeid';
import { zValidator } from '@u22n/hono/helpers';
import { and, eq } from '@u22n/database/orm';
import { createHonoApp } from '@u22n/hono';
import { db } from '@u22n/database';
import type { Ctx } from '../ctx';
import { s3Client } from '../s3';
import { env } from '../env';
import { z } from 'zod';

export const attachmentProxy = createHonoApp<Ctx>().get(
  '/:orgShortcode/:attachmentId/:filename',
  zValidator(
    'param',
    z.object({
      filename: z.string().transform((f) => decodeURIComponent(f)),
      attachmentId: typeIdValidator('convoAttachments'),
      orgShortcode: z.string()
    })
  ),
  async (c) => {
    const { filename, attachmentId, orgShortcode } = c.req.valid('param');

    const attachmentQueryResponse = await db.query.convoAttachments.findFirst({
      where: eq(convoAttachments.publicId, attachmentId),
      columns: {
        fileName: true,
        orgId: true,
        public: true
      }
    });

    if (
      !attachmentQueryResponse ||
      attachmentQueryResponse.fileName !== filename
    ) {
      return c.json(
        { error: `Attachment ${filename} not found` },
        { status: 404 }
      );
    }

    const orgQueryResponse = await db.query.orgs.findFirst({
      where: eq(orgs.shortcode, orgShortcode),
      columns: {
        id: true,
        publicId: true
      }
    });

    if (!orgQueryResponse) {
      return c.json({ error: 'Invalid org' }, { status: 400 });
    }

    if (!attachmentQueryResponse.public) {
      const accountId = c.get('account')?.id;
      if (!accountId) return c.json({ error: 'Unauthorized' }, { status: 401 });

      const orgAccountMembershipResponse = await db.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.orgId, orgQueryResponse.id),
          eq(orgMembers.accountId, accountId)
        ),
        columns: {
          id: true
        }
      });
      if (!orgAccountMembershipResponse)
        return c.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgPublicId = orgQueryResponse.publicId;
    const command = new GetObjectCommand({
      Bucket: env.STORAGE_S3_BUCKET_ATTACHMENTS,
      Key: `${orgPublicId}/${attachmentId}/${filename}`
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const res = await fetch(url).then((res) => c.body(res.body, res));
    if (!res.ok) {
      return c.json(
        { error: 'Error while fetching attachment' },
        { status: 500 }
      );
    }
    return res;
  }
);
