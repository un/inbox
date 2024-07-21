import { cleanupExpiredSessions } from '../functions/cleanup-expired-sessions';
import { discord } from '@u22n/utils/discord';
import { CronJob } from 'cron';

// This CronJob will cleanup expired sessions every day at 3 UTC
export const sessionCleanupCronJob = new CronJob('0 3 * * *', async () => {
  const { removedSessions, timeElapsed } = await cleanupExpiredSessions();
  await discord.info(
    `Expired Session Cleanup. Removed ${removedSessions} sessions, Took ${timeElapsed}ms to complete.`
  );
});
