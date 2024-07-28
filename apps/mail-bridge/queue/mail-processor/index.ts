import type { MailParamsSchema, PostalMessageSchema } from './schemas';
import { env } from '../../env';
import { Queue } from 'bullmq';

const { host, username, password, port } = new URL(
  env.DB_REDIS_CONNECTION_STRING
);

export const mailProcessorQueue = new Queue<{
  rawMessage: PostalMessageSchema;
  params: MailParamsSchema;
}>('mail-processor', {
  connection: {
    host: host.split(':')[0],
    port: Number(port),
    username,
    password
  },
  defaultJobOptions: {
    removeOnComplete: {
      age: env.MAILBRIDGE_QUEUE_COMPLETED_MAX_AGE_SECONDS
    }
  }
});
