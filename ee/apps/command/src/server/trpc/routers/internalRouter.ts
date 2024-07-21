import { router, accountProcedure } from '../trpc';
import { sessions } from '@u22n/database/schema';
import { lte } from '@u22n/database/orm';
import { db } from '@u22n/database';

export const internalRouter = router({
  removeExpiredSessions: accountProcedure.mutation(async () => {
    const { rowsAffected } = await db
      .delete(sessions)
      .where(lte(sessions.expiresAt, new Date()));
    return { count: rowsAffected };
  })
});
