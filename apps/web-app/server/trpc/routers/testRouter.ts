import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, publicProcedure } from '../trpc';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';
import { nanoid } from '@uninbox/utils';
import { mailBridgeTrpcClient } from '~/server/utils/mailBridgeTrpc';

export const testRouter = router({
  runTest: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(20)
      })
    )
    .query(async ({ ctx, input }) => {
      const testResult = await mailBridgeTrpcClient.postal.createOrg.query({
        username: 'demo'
      });

      return { testResult };
    })
});
