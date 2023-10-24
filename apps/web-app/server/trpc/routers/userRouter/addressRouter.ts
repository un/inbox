import { isUserInOrg } from '~/server/utils/dbQueries';
import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../../trpc';
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
    }),
  getUserEmailIdentities: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(1).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;

      const userInOrg = await isUserInOrg({
        orgPublicId: input.orgPublicId,
        userId: queryUserId
      });

      if (!userInOrg) {
        throw new Error('User is not in org');
      }

      // search for user org memberships, get id of membership
      const userOrgMembershipQuery = await db.read.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.userId, queryUserId),
          eq(orgMembers.orgId, userInOrg.orgId)
        ),
        columns: {
          id: true
        }
      });

      if (!userOrgMembershipQuery?.id) {
        throw new Error('User is not in org');
      }
      const userOrgMembershipId = userOrgMembershipQuery?.id;
      // search for user org group memberships, get id of org group

      const userOrgGroupMembershipQuery =
        await db.read.query.userGroupMembers.findMany({
          where: eq(userGroupMembers.userId, queryUserId),
          columns: {
            groupId: true
          },
          with: {
            group: {
              columns: {
                id: true,
                orgId: true
              }
            }
          }
        });

      const userGroupIds = userOrgGroupMembershipQuery
        .filter(
          (userOrgGroupMembership) =>
            userOrgGroupMembership.group.orgId === userInOrg.orgId
        )
        .map((userOrgGroupMembership) => userOrgGroupMembership.group.id);

      if (!userGroupIds.length) {
        userGroupIds.push(0);
      }

      // search email routingrulesdestinations for orgmemberId or orgGroupId

      const routingRulesDestinationsQuery =
        await db.read.query.emailRoutingRulesDestinations.findMany({
          where: or(
            eq(emailRoutingRulesDestinations.orgMemberId, userOrgMembershipId),
            inArray(emailRoutingRulesDestinations.groupId, userGroupIds || [0])
          ),
          with: {
            rule: {
              with: {
                mailIdentities: {
                  columns: {
                    publicId: true,
                    username: true,
                    domainName: true,
                    sendName: true
                  }
                }
              }
            }
          }
        });

      const emailIdentities = routingRulesDestinationsQuery.map(
        (routingRulesDestination) => {
          const emailIdentity = routingRulesDestination.rule.mailIdentities[0];
          return {
            publicId: emailIdentity.publicId,
            username: emailIdentity.username,
            domainName: emailIdentity.domainName,
            sendName: emailIdentity.sendName
          };
        }
      );

      return {
        emailIdentities: emailIdentities
      };
    })
});
