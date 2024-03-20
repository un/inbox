import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@u22n/database';
import { and, eq } from '@u22n/database/orm';
import { orgMembers, orgs, pendingAttachments } from '@u22n/database/schema';
import { z } from 'zod';
import type { S3Config } from '../../types';
import {
  eventHandler,
  loggedIn,
  getValidatedQuery,
  setResponseStatus,
  send,
  useRuntimeConfig,
  s3Client
} from '#imports';
import { typeIdGenerator } from '@u22n/utils';

const bodySchema = z.object({
  orgSlug: z.string(),
  filename: z.string()
});
/**
 * Returns a presigned URL for uploading an attachment to S3
 */
export default eventHandler({
  onRequest: [loggedIn],
  async handler(event) {
    const inputValidation = await getValidatedQuery(event, (body) =>
      bodySchema.safeParse(body)
    );
    if (!inputValidation.success) {
      setResponseStatus(event, 400);
      return send(event, 'Invalid input');
    }
    const data = inputValidation.data;

    const userId = event.context.user.id;

    const orgQueryResponse = await db.query.orgs.findFirst({
      where: eq(orgs.slug, data.orgSlug),
      columns: {
        id: true,
        publicId: true
      }
    });
    if (!orgQueryResponse) {
      setResponseStatus(event, 400);
      return send(event, 'Invalid org');
    }

    const orgUserMembershipResponse = await db.query.orgMembers.findFirst({
      where: and(
        eq(orgMembers.orgId, orgQueryResponse.id),
        eq(orgMembers.userId, userId)
      ),
      columns: {
        id: true
      }
    });
    if (!orgUserMembershipResponse) {
      setResponseStatus(event, 401);
      return send(event, 'Unauthorized');
    }

    const orgPublicId = orgQueryResponse.publicId;
    const attachmentPublicId = typeIdGenerator('pendingAttachments');
    const filename = data.filename;

    const s3Config: S3Config = useRuntimeConfig().s3;
    const command = new PutObjectCommand({
      Bucket: s3Config.bucketAttachments,
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

    return { publicId: attachmentPublicId, signedUrl: signedUrl };
  }
});
