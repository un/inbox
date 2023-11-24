import { z } from 'zod';
import { router, orgProcedure, limitedProcedure } from '../../../trpc';
import {
  and,
  eq,
  inArray,
  or,
  type InferInsertModel
} from '@uninbox/database/orm';
import {
  orgs,
  orgMembers,
  domains,
  userGroups,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  emailIdentities,
  userGroupMembers
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';
import dns from 'dns';
import { verifyDns } from '~/server/utils/verifyDns';
import { isUserInOrg } from '~/server/utils/dbQueries';
import { isUserAdminOfOrg } from '~/server/utils/user';
import { TRPCError } from '@trpc/server';

export const emailIdentityRouter = router({
  createNewEmailIdentity: orgProcedure
    .input(
      z.object({
        emailUsername: z.string().min(1).max(255),
        domainPublicId: z.string().min(3).max(nanoIdLength),
        sendName: z.string().min(3).max(255),
        catchAll: z.boolean().optional().default(false),
        routeToUsersOrgMemberPublicIds: z
          .array(z.string().min(3).max(nanoIdLength))
          .optional(),
        routeToGroupsPublicIds: z
          .array(z.string().min(3).max(nanoIdLength))
          .optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;
      const {
        domainPublicId,
        sendName,
        catchAll,
        routeToUsersOrgMemberPublicIds,
        routeToGroupsPublicIds
      } = input;

      const emailUsername = input.emailUsername.toLowerCase();
      const newPublicId = nanoId();

      const isAdmin = await isUserAdminOfOrg(org, userId);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      if (!routeToUsersOrgMemberPublicIds && !routeToGroupsPublicIds) {
        throw new Error('Must route to at least one user or group');
      }

      const domainResponse = await db.read.query.domains.findFirst({
        where: and(
          eq(domains.publicId, domainPublicId),
          eq(domains.orgId, +orgId)
        ),
        columns: {
          id: true,
          domain: true,
          catchAllAddress: true
        }
      });
      if (!domainResponse) {
        throw new Error('Domain not found');
      }
      if (domainResponse.catchAllAddress && catchAll) {
        throw new Error('Domain already has catch all address');
      }

      const orgMemberIds: number[] = [];
      const orgMemberIdsResponse =
        routeToUsersOrgMemberPublicIds &&
        routeToUsersOrgMemberPublicIds.length > 0
          ? await db.read.query.orgMembers.findMany({
              where: inArray(
                orgMembers.publicId,
                routeToUsersOrgMemberPublicIds
              ),
              columns: {
                id: true
              }
            })
          : [];
      orgMemberIdsResponse.forEach((orgMember) => {
        orgMemberIds.push(orgMember.id);
      });

      const userGroupIds: number[] = [];
      const userGroupIdsResponse =
        routeToGroupsPublicIds && routeToGroupsPublicIds.length > 0
          ? await db.read.query.userGroups.findMany({
              where: inArray(userGroups.publicId, routeToGroupsPublicIds),
              columns: {
                id: true
              }
            })
          : [];
      userGroupIdsResponse.forEach((userGroup) => {
        userGroupIds.push(userGroup.id);
      });

      // create email routing rule

      const insertEmailRoutingRule = await db.write
        .insert(emailRoutingRules)
        .values({
          publicId: newPublicId,
          orgId: +orgId,
          createdBy: +userId,
          name: emailUsername,
          description: `Email routing rule for ${emailUsername}@${domainResponse.domain}`
        });

      type InsertRoutingRuleDestination = InferInsertModel<
        typeof emailRoutingRulesDestinations
      >;
      // create email routing rule destinations
      const routingRuleInsertValues: InsertRoutingRuleDestination[] = [];
      if (orgMemberIds.length > 0) {
        orgMemberIds.forEach((orgMemberId) => {
          routingRuleInsertValues.push({
            ruleId: +insertEmailRoutingRule.insertId,
            orgMemberId: orgMemberId
          });
        });
      }
      if (userGroupIds.length > 0) {
        userGroupIds.forEach((userGroupId) => {
          routingRuleInsertValues.push({
            ruleId: +insertEmailRoutingRule.insertId,
            groupId: userGroupId
          });
        });
      }

      await db.write
        .insert(emailRoutingRulesDestinations)
        .values(routingRuleInsertValues);

      const emailIdentityPublicId = nanoId();
      // create address
      const insertEmailIdentityResponse = await db.write
        .insert(emailIdentities)
        .values({
          publicId: emailIdentityPublicId,
          orgId: +orgId,
          createdBy: userId,
          username: emailUsername,
          domainName: domainResponse.domain,
          domainId: domainResponse.id,
          routingRuleId: +insertEmailRoutingRule.insertId,
          sendName: sendName,
          isCatchAll: catchAll
        });

      if (catchAll) {
        await db.write
          .update(domains)
          .set({
            catchAllAddress: +insertEmailIdentityResponse.insertId
          })
          .where(eq(domains.id, domainResponse.id));
      }

      return {
        emailIdentity: emailIdentityPublicId
      };
    }),

  getEmailIdentity: orgProcedure
    .input(
      z.object({
        emailIdentityPublicId: z.string().min(3).max(nanoIdLength),
        newEmailIdentity: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;
      const { emailIdentityPublicId } = input;

      const dbReplica = input.newEmailIdentity ? db.write : db.read;

      const emailIdentityResponse =
        await dbReplica.query.emailIdentities.findFirst({
          where: and(
            eq(emailIdentities.publicId, emailIdentityPublicId),
            eq(domains.orgId, +orgId)
          ),
          columns: {
            publicId: true,
            username: true,
            domainName: true,
            sendName: true,
            isCatchAll: true,
            avatarId: true
          },
          with: {
            domain: {
              columns: {
                sendingMode: true,
                receivingMode: true,
                domainStatus: true
              }
            },
            routingRules: {
              columns: {
                publicId: true,
                name: true,
                description: true
              },
              with: {
                destinations: {
                  with: {
                    group: {
                      columns: {
                        publicId: true,
                        name: true,
                        description: true,
                        avatarId: true,
                        color: true
                      }
                    },
                    orgMember: {
                      with: {
                        profile: {
                          columns: {
                            publicId: true,
                            avatarId: true,
                            firstName: true,
                            lastName: true,
                            handle: true,
                            title: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });

      return {
        emailIdentityData: emailIdentityResponse
      };
    }),
  getOrgEmailIdentities: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;

      const emailIdentityResponse =
        await db.read.query.emailIdentities.findMany({
          where: eq(domains.orgId, +orgId),
          columns: {
            publicId: true,
            username: true,
            domainName: true,
            sendName: true,
            isCatchAll: true,
            avatarId: true
          },
          with: {
            domain: {
              columns: {
                sendingMode: true,
                receivingMode: true,
                domainStatus: true
              }
            },
            routingRules: {
              columns: {
                publicId: true,
                name: true,
                description: true
              },
              with: {
                destinations: {
                  with: {
                    group: {
                      columns: {
                        publicId: true,
                        name: true,
                        description: true,
                        avatarId: true,
                        color: true
                      }
                    },
                    orgMember: {
                      with: {
                        profile: {
                          columns: {
                            publicId: true,
                            avatarId: true,
                            firstName: true,
                            lastName: true,
                            handle: true,
                            title: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });

      return {
        emailIdentityData: emailIdentityResponse
      };
    }),
  getUserEmailIdentities: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;

      // search for user org memberships, get id of membership
      const userOrgMembershipQuery = await db.read.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.userId, +userId),
          eq(orgMembers.orgId, +orgId)
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

      //TODO: Add filter for org id
      const userOrgGroupMembershipQuery =
        await db.read.query.userGroupMembers.findMany({
          where: eq(userGroupMembers.userId, +userId),
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

      const orgGroupIds = userOrgGroupMembershipQuery.filter(
        (userOrgGroupMembership) =>
          userOrgGroupMembership.group.orgId === +orgId
      );

      const userGroupIds = orgGroupIds.map(
        (orgGroupIds) => orgGroupIds.group.id
      );
      const uniqueUserGroupIds = [...new Set(userGroupIds)];

      if (!uniqueUserGroupIds.length) {
        uniqueUserGroupIds.push(0);
      }

      // search email routingrulesdestinations for orgmemberId or orgGroupId

      const routingRulesDestinationsQuery =
        await db.read.query.emailRoutingRulesDestinations.findMany({
          where: or(
            eq(emailRoutingRulesDestinations.orgMemberId, userOrgMembershipId),
            inArray(
              emailRoutingRulesDestinations.groupId,
              uniqueUserGroupIds || [0]
            )
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
      const emailIdentities = routingRulesDestinationsQuery
        .map((routingRulesDestination) => {
          const emailIdentity = routingRulesDestination.rule.mailIdentities[0];
          return {
            publicId: emailIdentity.publicId,
            username: emailIdentity.username,
            domainName: emailIdentity.domainName,
            sendName: emailIdentity.sendName
          };
        })
        .filter(
          (identity, index, self) =>
            index === self.findIndex((t) => t.publicId === identity.publicId)
        );

      // TODO: Check if domains are enabled/validated, if not return invalid, but display the email address in the list with a tooltip
      return {
        emailIdentities: emailIdentities
      };
    })
});
