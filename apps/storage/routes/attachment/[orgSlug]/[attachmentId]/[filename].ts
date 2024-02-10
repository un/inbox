import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../../../utils/s3';
import { db } from '@uninbox/database';
import { and, eq } from '@uninbox/database/orm';
import { convoAttachments, orgMembers, orgs } from '@uninbox/database/schema';

/**
 * provides a proxy to attachments after verifying the user has access to the attachment
 * path: storageServer/attachment/[orgSlug]/[attachmentId]/[filename.ext]
 */
export default eventHandler({
  async handler(event) {
    const orgSlug = getRouterParam(event, 'orgSlug');
    const attachmentPublicId = getRouterParam(event, 'attachmentId');
    const filename = getRouterParam(event, 'filename');

    // attachment url: https://s3/attachments/[orgPublicId]/[attachmentId]/[filename].ext

    const attachmentQueryResponse = await db.query.convoAttachments.findFirst({
      where: eq(convoAttachments.publicId, attachmentPublicId),
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
      return `Attachment ${filename} not found`;
    }

    const orgQueryResponse = await db.query.orgs.findFirst({
      where: eq(orgs.slug, orgSlug),
      columns: {
        id: true,
        publicId: true
      }
    });
    if (!orgQueryResponse) {
      setResponseStatus(event, 400);
      return send(event, 'Invalid org');
    }

    if (!attachmentQueryResponse.public) {
      const userId = event.context.user.id;
      if (!userId) {
        setResponseStatus(event, 401);
        return send(event, 'Unauthorized');
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
    }

    const orgPublicId = orgQueryResponse.publicId;
    const command = new GetObjectCommand({
      Bucket: 'attachments',
      Key: `${orgPublicId}/${attachmentPublicId}/${filename}`
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return sendProxy(event, url);
  }
});
