import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, publicProcedure } from '../trpc';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';
import { nanoId } from '@uninbox/utils';
import { mailBridgeTrpcClient } from '~/server/utils/tRPCServerClients';
import { TRPCError } from '@trpc/server';

export const testRouter = router({
  runTest: publicProcedure.query(async ({ ctx, input }) => {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User not in org'
    });

    const timestamp = new Date().toISOString();
    const orgIdFromContext = ctx.orgId;
    return { timestamp, orgIdFromContext };
  })
});
