import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';
import type { S3Config } from '../../types';
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
  attachments: z.string().array()
});
/**
 * Given an array if attachment Object Keys, it will delete them from s3
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

    const { attachments } = inputValidation.data;

    const attachmentKeys = attachments.map((attachment) => {
      return { Key: attachment };
    });

    const s3Config: S3Config = useRuntimeConfig().s3;
    const command = new DeleteObjectsCommand({
      Bucket: s3Config.bucketAttachments,
      Delete: {
        Objects: attachmentKeys
      }
    });
    try {
      await s3Client.send(command);
    } catch (err) {
      console.error('🔥 Tried deleting some attachments', { attachments, err });
    }

    return send(event, 'ok');
  }
});
