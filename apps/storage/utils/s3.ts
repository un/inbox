import { S3Client } from '@aws-sdk/client-s3';
import { S3Config } from '../types';
const s3Config: S3Config = useRuntimeConfig().s3;
export const s3Client = new S3Client({
  region: s3Config.region,
  endpoint: s3Config.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey
  }
});
