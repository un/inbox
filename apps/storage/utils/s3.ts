import { S3Client } from '@aws-sdk/client-s3';
const config = useRuntimeConfig();
export const s3Client = new S3Client({
  region: config.s3Region,
  endpoint: config.s3Endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.s3AccessKeyId,
    secretAccessKey: config.s3SecretAccessKey
  }
});
