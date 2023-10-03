import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../trpc';
// import { and, eq } from '@uninbox/database/orm';
// import {
//   postalServers,
//   orgPostalConfigs,
//   domains
// } from '@uninbox/database/schema';
// import { nanoId, nanoIdLength } from '@uninbox/utils';

export const stripeRouter = router({
  createDomain: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        //orgPublicId: z.string().min(3).max(nanoIdLength),
        domainName: z.string().min(3).max(255)
      })
    )
    .mutation(async ({ ctx, input }) => {
      //const { config, db } = ctx;
      const { config } = ctx;
      const { orgId } = input;

      return {
        yo: 'yo'
      };
    })
});
