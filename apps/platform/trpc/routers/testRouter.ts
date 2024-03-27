import { router, publicProcedure } from '~/trpc/trpc';
import { TRPCError } from '@trpc/server';

// TODO: Figure out what to do with this route

export const testRouter = router({
  runTest: publicProcedure.query(async () => {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User not in org'
    });
  })
});
