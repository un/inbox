import { z } from 'zod';
import { router, orgProcedure, limitedProcedure } from '../../trpc';
import { and, eq, or } from '@uninbox/database/orm';
import {
  orgs,
  contacts,
  contactGlobalReputations
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';
import { TRPCError } from '@trpc/server';

export const contactsRouter = router({
  getOrgContacts: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;

      const orgContactsResponse = await db.query.contacts.findMany({
        where: and(eq(contacts.orgId, orgId), eq(contacts.type, 'person')),
        columns: {
          publicId: true,
          avatarId:true,
          emailUsername: true,
          emailDomain: true,
          name: true,
          setName: true,
          screenerStatus: true
        }
      });
      return { contacts: orgContactsResponse };
    })
});
