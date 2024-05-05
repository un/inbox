import { Hono } from 'hono';
import type { Ctx } from '../ctx';
import { checkSignedIn } from '../middlewares';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { orgMembers, orgs, pendingAttachments } from '@u22n/database/schema';
import { and, eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { typeIdGenerator } from '@u22n/utils';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env';
import { s3Client } from '../s3';

export const presignApi = new Hono<Ctx>().get(
  '/attachments/presign',
  checkSignedIn,
  zValidator(
    'query',
    z.object({ filename: z.string(), orgShortCode: z.string() })
  ),
  async (c) => {
    const accountId = c.get('account')?.id!; // we know it's not null here, checked in the middleware
    const data = c.req.valid('query');

    const orgQueryResponse = await db.query.orgs.findFirst({
      where: eq(orgs.shortcode, data.orgShortCode),
      columns: {
        id: true,
        publicId: true
      }
    });

    if (!orgQueryResponse) {
      return c.json({ error: 'Invalid org' }, { status: 400 });
    }

    const orgAccountMembershipResponse = await db.query.orgMembers.findFirst({
      where: and(
        eq(orgMembers.orgId, orgQueryResponse.id),
        eq(orgMembers.accountId, accountId)
      ),
      columns: {
        id: true
      }
    });

    if (!orgAccountMembershipResponse) {
      return c.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgPublicId = orgQueryResponse.publicId;
    const attachmentPublicId = typeIdGenerator('convoAttachments');
    const filename = data.filename;

    const command = new PutObjectCommand({
      Bucket: env.STORAGE_S3_BUCKET_ATTACHMENTS,
      Key: `${orgPublicId}/${attachmentPublicId}/${filename}`
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600
    });

    await db.insert(pendingAttachments).values({
      orgId: orgQueryResponse.id,
      orgPublicId: orgPublicId,
      publicId: attachmentPublicId,
      filename: filename
    });

    return c.json({ publicId: attachmentPublicId, signedUrl });
  }
);
