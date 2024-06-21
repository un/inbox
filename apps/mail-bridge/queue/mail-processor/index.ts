import { Queue } from 'bullmq';
import { env } from '../../env';
import type { MailParamsSchema, PostalMessageSchema } from './schemas';

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
    removeOnComplete: true
  }
});
