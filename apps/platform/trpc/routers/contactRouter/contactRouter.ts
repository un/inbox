import { z } from 'zod';
import { router, orgProcedure } from '../../trpc';
import { and, eq } from '@u22n/database/orm';
import { contacts } from '@u22n/database/schema';
import { TRPCError } from '@trpc/server';

export const contactsRouter = router({
  getOrgContacts: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;

      const orgContactsResponse = await db.query.contacts.findMany({
        where: and(eq(contacts.orgId, orgId), eq(contacts.type, 'person')),
        columns: {
          publicId: true,
          avatarId: true,
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
