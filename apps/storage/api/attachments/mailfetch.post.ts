import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import type { S3Config } from '~/types';
import {
  authorizedService,
  eventHandler,
  readValidatedBody,
  setResponseStatus,
  send,
  useRuntimeConfig,
  s3Client
} from '#imports';

const bodySchema = z.object({
  orgPublicId: z.string(),
  attachmentPublicId: z.string(),
  filename: z.string()
});
/**
 * Returns a presigned URL for downloading an attachment from S3
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
    const { orgPublicId, attachmentPublicId, filename } = inputValidation.data;

    const s3Config: S3Config = useRuntimeConfig().s3;
    const command = new GetObjectCommand({
      Bucket: s3Config.bucketAttachments,
      Key: `${orgPublicId}/${attachmentPublicId}/${filename}`
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return { url: url };
  }
});
