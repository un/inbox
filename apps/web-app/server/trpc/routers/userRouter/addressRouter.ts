import { isUserInOrg } from '~/server/utils/dbQueries';
import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, userProcedure } from '../../trpc';
import { and, eq, inArray, or } from '@uninbox/database/orm';
import {
  users,
  userProfiles,
  postalServers,
  orgs,
  emailIdentities,
  orgMembers,
  userGroups,
  userGroupMembers,
  emailRoutingRulesDestinations
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';

export const addressRouter = router({
  getPersonalAddresses: userProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user?.id || 0;

      const usersPersonalOrgIdQuery = await db.read.query.orgs.findFirst({
        where: and(eq(orgs.ownerId, +userId), eq(orgs.personalOrg, true)),
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
            publicId: true,
            sendName: true,
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
