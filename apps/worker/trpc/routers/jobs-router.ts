import { z } from 'zod';
import { addImmediateDnsCheckJob } from '../../services/dns-check-queue';
import { procedure, router } from '../trpc';
import { typeIdValidator } from '@u22n/utils/typeid';
import { cleanupExpiredSessions } from '../../functions/cleanup-expired-sessions';

export const jobsRouter = router({
  cleanUpExpiredSessions: procedure.mutation(async () => {
    await cleanupExpiredSessions();
  }),
  addImmediateDnsCheck: procedure
    .input(z.object({ domainPublicId: typeIdValidator('domains') }))
    .mutation(async ({ input }) => {
      await addImmediateDnsCheckJob(input.domainPublicId);
    })
});
