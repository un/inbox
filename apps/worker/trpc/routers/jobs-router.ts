import { cleanupExpiredSessions } from '../../functions/cleanup-expired-sessions';
import { addImmediateDnsCheckJob } from '../../services/dns-check-queue';
import { typeIdValidator } from '@u22n/utils/typeid';
import { procedure, router } from '../trpc';
import { z } from 'zod';

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
