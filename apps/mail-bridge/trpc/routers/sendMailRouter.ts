import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  emailIdentities,
  emailRoutingRules,
  emailIdentitiesAuthorizedUsers,
  postalServers
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
import { postalPuppet } from '@uninbox/postal-puppet';
import { eq } from '@uninbox/database/orm';
import { convert } from 'html-to-text';

export const sendMailRouter = router({
  sendNewEmail: protectedProcedure
    .input(
      z.object({
        recipients: z.array(z.string().email()),
        fromIdentityPublicId: z.string(),
        subject: z.string(),
        htmlBody: z.string(),
        convoMessageId: z.number()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config, db } = ctx;

      const plainTextBody = convert(input.htmlBody);
      return {
        success: true,
        userId: userId,
        emailIdentity: userRootEmailAddress
      };
    })
});
