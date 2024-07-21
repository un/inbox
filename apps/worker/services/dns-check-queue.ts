import { createQueue, createWorker } from '../utils/queue-helpers';
import { checkDns } from '../functions/check-dns';
import type { TypeId } from '@u22n/utils/typeid';
import { db } from '@u22n/database';
import { CronJob } from 'cron';

const QUEUE_NAME = 'dns-check';

type DnsCheckJobData = {
  domainPublicId: TypeId<'domains'>;
};

const dnsCheckQueue = createQueue<DnsCheckJobData>(QUEUE_NAME, {
  defaultJobOptions: { removeOnComplete: true, attempts: 3 }
});

export const dnsCheckWorker = createWorker<DnsCheckJobData>(QUEUE_NAME, (job) =>
  checkDns(job.data.domainPublicId)
);

export async function addImmediateDnsCheckJob(
  domainPublicId: TypeId<'domains'>
) {
  await dnsCheckQueue.add(`immediate-dns-check:${domainPublicId}`, {
    domainPublicId
  });
}

// This CronJob will add a job for every domain in the database at 6,14,22 UTC hours
export const masterCronJob = new CronJob('0 6,14,22 * * *', async () => {
  const activeDomains = await db.query.domains.findMany({
    columns: { publicId: true }
  });
  await dnsCheckQueue.addBulk(
    activeDomains.map((domain) => ({
      name: `cron-dns-check:${domain.publicId}`,
      data: { domainPublicId: domain.publicId }
    }))
  );
});
