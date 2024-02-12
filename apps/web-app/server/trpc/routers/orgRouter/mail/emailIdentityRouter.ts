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
import {
  nanoId,
  nanoIdLength,
  nanoIdToken,
  nanoIdSchema
} from '@uninbox/utils';
import dns from 'dns';
import { verifyDns } from '~/server/utils/verifyDns';
import { isUserInOrg } from '~/server/utils/dbQueries';
import { isUserAdminOfOrg } from '~/server/utils/user';
import { TRPCError } from '@trpc/server';

export const emailIdentityRouter = router({
  checkEmailAvailability: orgProcedure
    .input(
      z.object({
        emailUsername: z.string().min(1).max(255),
        domainPublicId: nanoIdSchema
      })
    )
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

      const { emailUsername, domainPublicId } = input;

      const domainResponse = await db.query.domains.findFirst({
        where: and(
          eq(domains.publicId, domainPublicId),
          eq(domains.orgId, orgId)
        ),
        columns: {
          id: true,
          domain: true
        }
      });

      if (!domainResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domain not found'
        });
      }

      const emailIdentityResponse = await db.query.emailIdentities.findFirst({
        where: and(
          eq(emailIdentities.username, emailUsername),
          eq(emailIdentities.domainId, domainResponse.id)
        ),
        columns: {
          id: true
        }
      });

      if (emailIdentityResponse) {
        return {
          available: false
        };
      }

      return {
        available: true
      };
    }),
  createNewEmailIdentity: orgProcedure
    .input(
      z.object({
        emailUsername: z.string().min(1).max(255),
        domainPublicId: nanoIdSchema,
        sendName: z.string().min(3).max(255),
        catchAll: z.boolean().optional().default(false),
        routeToUsersOrgMemberPublicIds: z.array(nanoIdSchema).optional(),
        routeToGroupsPublicIds: z.array(nanoIdSchema).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;
      const {
        domainPublicId,
        sendName,
        catchAll,
        routeToUsersOrgMemberPublicIds,
        routeToGroupsPublicIds
      } = input;

      const emailUsername = input.emailUsername.toLowerCase();
      const newPublicId = nanoId();

      const isAdmin = await isUserAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      if (!routeToUsersOrgMemberPublicIds && !routeToGroupsPublicIds) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must route to at least one user or group'
        });
      }

      const domainResponse = await db.query.domains.findFirst({
        where: and(
          eq(domains.publicId, domainPublicId),
          eq(domains.orgId, orgId)
        ),
        columns: {
          id: true,
          domain: true,
          catchAllAddress: true
        }
      });
      if (!domainResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domain not found'
        });
      }
      if (domainResponse.catchAllAddress && catchAll) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domain already has catch all address'
        });
      }

      const orgMemberIds: number[] = [];
      const orgMemberIdsResponse =
        routeToUsersOrgMemberPublicIds &&
        routeToUsersOrgMemberPublicIds.length > 0
          ? await db.query.orgMembers.findMany({
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
          ? await db.query.userGroups.findMany({
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

      const insertEmailRoutingRule = await db.insert(emailRoutingRules).values({
        publicId: newPublicId,
        orgId: orgId,
        createdBy: userId,
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
            orgId: orgId,
            ruleId: +insertEmailRoutingRule.insertId,
            orgMemberId: orgMemberId
          });
        });
      }
      if (userGroupIds.length > 0) {
        userGroupIds.forEach((userGroupId) => {
          routingRuleInsertValues.push({
            orgId: orgId,
            ruleId: +insertEmailRoutingRule.insertId,
            groupId: userGroupId
          });
        });
      }

      await db
        .insert(emailRoutingRulesDestinations)
        .values(routingRuleInsertValues);

      const emailIdentityPublicId = nanoId();
      // create address
      const insertEmailIdentityResponse = await db
        .insert(emailIdentities)
        .values({
          publicId: emailIdentityPublicId,
          orgId: orgId,
          createdBy: userId,
          username: emailUsername,
          domainName: domainResponse.domain,
          domainId: domainResponse.id,
          routingRuleId: +insertEmailRoutingRule.insertId,
          sendName: sendName,
          isCatchAll: catchAll
        });

      if (catchAll) {
        await db
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
        emailIdentityPublicId: nanoIdSchema,
        newEmailIdentity: z.boolean().optional()
      })
    )
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
      const { emailIdentityPublicId } = input;

      // Handle when adding database replicas
      const dbReplica = db;

      const emailIdentityResponse =
        await dbReplica.query.emailIdentities.findFirst({
          where: and(
            eq(emailIdentities.publicId, emailIdentityPublicId),
            eq(domains.orgId, orgId)
          ),
          columns: {
            publicId: true,
            username: true,
            domainName: true,
            sendName: true,
            isCatchAll: true
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
                        avatarId: true,
                        name: true,
                        description: true,
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
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;

      const emailIdentityResponse = await db.query.emailIdentities.findMany({
        where: eq(domains.orgId, orgId),
        columns: {
          publicId: true,
          username: true,
          domainName: true,
          sendName: true,
          isCatchAll: true
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
                      color: true
                    }
                  },
                  orgMember: {
                    with: {
                      profile: {
                        columns: {
                          publicId: true,
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
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;
      const orgMemberId = org?.memberId || 0;
      // search for user org group memberships, get id of org group

      const userOrgGroupMembershipQuery =
        await db.query.userGroupMembers.findMany({
          where: eq(userGroupMembers.orgMemberId, orgMemberId),
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
        (userOrgGroupMembership) => userOrgGroupMembership.group.orgId === orgId
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
        await db.query.emailRoutingRulesDestinations.findMany({
          where: or(
            eq(emailRoutingRulesDestinations.orgMemberId, orgMemberId),
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
