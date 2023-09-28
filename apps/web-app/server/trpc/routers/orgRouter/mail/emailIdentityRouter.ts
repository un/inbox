import { z } from 'zod';
import { router, protectedProcedure, limitedProcedure } from '../../../trpc';
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
  emailIdentities
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';
import dns from 'dns';
import { verifyDns } from '~/server/utils/verifyDns';
import { isUserInOrg } from '~/server/utils/dbQueries';

export const emailIdentityRouter = router({
  createNewEmailIdentity: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        emailUsername: z.string().min(3).max(255),
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
      const { db, user } = ctx;
      let {
        orgPublicId,
        emailUsername,
        domainPublicId,
        sendName,
        catchAll,
        routeToUsersOrgMemberPublicIds,
        routeToGroupsPublicIds
      } = input;
      const newPublicId = nanoId();
      const userId = user.userId || 0;

      const userOrg = await isUserInOrg({
        userId,
        orgPublicId
      });

      if (!userOrg) {
        return {
          error: 'User not in org'
        };
      }
      if (userOrg.role !== 'admin') {
        return {
          error: 'User not admin'
        };
      }

      if (!routeToUsersOrgMemberPublicIds && !routeToGroupsPublicIds) {
        throw new Error('Must route to at least one user or group');
      }

      const domainResponse = await db.read.query.domains.findFirst({
        where: and(
          eq(domains.publicId, domainPublicId),
          eq(domains.orgId, +userOrg.orgId)
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
          orgId: +userOrg.orgId,
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
          orgId: +userOrg.orgId,
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

  getEmailIdentity: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        emailIdentityPublicId: z.string().min(3).max(nanoIdLength),
        newEmailIdentity: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { orgPublicId, emailIdentityPublicId } = input;
      const userId = user.userId || 0;

      const dbReplica = input.newEmailIdentity ? db.write : db.read;

      const userOrg = await isUserInOrg({
        userId,
        orgPublicId
      });

      if (!userOrg) {
        return {
          error: 'User not in org'
        };
      }

      const emailIdentityResponse =
        await dbReplica.query.emailIdentities.findFirst({
          where: and(
            eq(emailIdentities.publicId, emailIdentityPublicId),
            eq(domains.orgId, +userOrg.orgId)
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
  getOrgEmailIdentities: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { orgPublicId } = input;
      const userId = user.userId || 0;

      const userOrg = await isUserInOrg({
        userId,
        orgPublicId
      });

      if (!userOrg) {
        return {
          error: 'User not in org'
        };
      }

      const emailIdentityReponse = await db.read.query.emailIdentities.findMany(
        {
          where: eq(domains.orgId, +userOrg.orgId),
          columns: {
            publicId: true,
            username: true,
            domainName: true,
            sendName: true,
            isCatchAll: true,
            avatarId: true
          },
          with: {
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
        }
      );

      return {
        emailIdentityData: emailIdentityReponse
      };
    })
});
