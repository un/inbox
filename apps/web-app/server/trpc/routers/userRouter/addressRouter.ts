import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../../trpc';
import { and, eq } from '@uninbox/database/orm';
import {
  users,
  userProfiles,
  postalServers,
  orgs,
  emailIdentities
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';

export const addressRouter = router({
  getPersonalAddresses: protectedProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;

      const usersPersonalOrgIdQuery = await db.read.query.orgs.findFirst({
        where: and(eq(orgs.ownerId, queryUserId), eq(orgs.personalOrg, true)),
        columns: {
          id: true
        }
      });

      if (!usersPersonalOrgIdQuery) {
        throw new Error('User has no personal org');
      }

      const userPersonalOrgFwdAddressQuery =
        await db.read.query.postalServers.findFirst({
          where: and(
            eq(postalServers.rootMailServer, true),
            eq(postalServers.orgId, +usersPersonalOrgIdQuery?.id)
          ),
          columns: {
            rootForwardingAddress: true
          }
        });

      const userPersonalEmailAddressesQuery =
        await db.read.query.emailIdentities.findMany({
          where: eq(emailIdentities.orgId, +usersPersonalOrgIdQuery?.id),
          columns: {
            username: true,
            domainName: true
          }
        });

      return {
        personalEmailAddresses: userPersonalEmailAddressesQuery,
        personalOrgFwdAddress:
          userPersonalOrgFwdAddressQuery?.rootForwardingAddress
      };
    })
});
