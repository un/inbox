import { router, orgProcedure } from '~platform/trpc/trpc';
import { contacts } from '@u22n/database/schema';
import { eq } from '@u22n/database/orm';

export const contactsRouter = router({
  getOrgContacts: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;
    const orgId = org.id;

    const orgContactsResponse = await db.query.contacts.findMany({
      where: eq(contacts.orgId, orgId),
      columns: {
        publicId: true,
        avatarTimestamp: true,
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
