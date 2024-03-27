import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../../../utils/s3';
import { db } from '@u22n/database';
import { and, eq } from '@u22n/database/orm';
import { convoAttachments, orgMembers, orgs } from '@u22n/database/schema';
import type { S3Config } from '../../../../types';
import {
  eventHandler,
  getRouterParam,
  setResponseStatus,
  send,
  sendProxy,
  useRuntimeConfig
} from '#imports';
import { validateTypeId } from '@u22n/utils';

/**
 * provides a proxy to attachments after verifying the account has access to the attachment
 * path: storageServer/attachment/[orgSlug]/[attachmentId]/[filename.ext]
 */
export default eventHandler({
  async handler(event) {
    const orgSlug = getRouterParam(event, 'orgSlug');
    const attachmentPublicId = getRouterParam(event, 'attachmentId');
    const filename = getRouterParam(event, 'filename');

    if (!orgSlug || !attachmentPublicId || !filename) {
      return 'Missing required parameters';
    }

    if (!validateTypeId('convoAttachments', attachmentPublicId)) {
      return `Invalid attachment id`;
    }
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
      const accountId = event.context.account.id;
      if (!accountId) {
        setResponseStatus(event, 401);
        return send(event, 'Unauthorized');
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
        setResponseStatus(event, 401);
        return send(event, 'Unauthorized');
      }
    }
    const s3Config: S3Config = useRuntimeConfig().s3;
    const orgPublicId = orgQueryResponse.publicId;
    const command = new GetObjectCommand({
      Bucket: s3Config.bucketAttachments,
      Key: `${orgPublicId}/${attachmentPublicId}/${filename}`
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return sendProxy(event, url);
  }
});
