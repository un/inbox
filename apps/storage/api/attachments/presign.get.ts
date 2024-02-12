import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@uninbox/database';
import { and, eq } from '@uninbox/database/orm';
import { orgMembers, orgs } from '@uninbox/database/schema';
import { nanoId } from '@uninbox/utils';
import { z } from 'zod';

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
    const attachmentPublicId = nanoId();
    const filename = data.filename;

    const command = new PutObjectCommand({
      Bucket: 'attachments',
      Key: `${orgPublicId}/${attachmentPublicId}/${filename}`
    });
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600
    });

    return { publicId: attachmentPublicId, signedUrl: signedUrl };
  }
});
