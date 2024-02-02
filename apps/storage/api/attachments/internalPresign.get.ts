import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@uninbox/database';
import { and, eq } from '@uninbox/database/orm';
import { orgMembers, orgs } from '@uninbox/database/schema';
import { nanoId } from '@uninbox/utils';
import { z } from 'zod';

const bodySchema = z.object({
  orgPublicId: z.string(),
  filename: z.string()
});
/**
 * Returns a presigned URL for uploading an attachment to S3
 */
export default eventHandler({
  onRequest: [authorizedService],
  async handler(event) {
    const inputValidation = await readValidatedBody(event, (body) =>
      bodySchema.safeParse(body)
    );
    if (!inputValidation.success) {
      setResponseStatus(event, 400);
      return send(event, 'Invalid input');
    }
    const { orgPublicId, filename } = inputValidation.data;
    const attachmentPublicId = nanoId();

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
