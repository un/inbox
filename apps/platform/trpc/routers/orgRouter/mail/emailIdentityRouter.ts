import { z } from 'zod';
import { router, orgProcedure } from '../../../trpc';
import {
  and,
  eq,
  inArray,
  or,
  type InferInsertModel
} from '@u22n/database/orm';
import {
  orgMembers,
  domains,
  groups,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  emailIdentities,
  groupMembers,
  emailIdentitiesAuthorizedOrgMembers
} from '@u22n/database/schema';
import { typeIdGenerator, typeIdValidator, type TypeId } from '@u22n/utils';
import { isAccountAdminOfOrg } from '../../../../utils/account';
import { TRPCError } from '@trpc/server';

export const emailIdentityRouter = router({
  checkEmailAvailability: orgProcedure
    .input(
      z.object({
        emailUsername: z.string().min(1).max(255),
        domainPublicId: typeIdValidator('domains')
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
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
        domainPublicId: typeIdValidator('domains'),
        sendName: z.string().min(3).max(255),
        catchAll: z.boolean().optional().default(false),
        routeToOrgMemberPublicIds: z
          .array(typeIdValidator('orgMembers'))
          .optional(),
        routeToGroupsPublicIds: z.array(typeIdValidator('groups')).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;
      const {
        domainPublicId,
        sendName,
        catchAll,
        routeToOrgMemberPublicIds,
        routeToGroupsPublicIds
      } = input;

      const emailUsername = input.emailUsername.toLowerCase();
      const newPublicId = typeIdGenerator('emailRoutingRules');

      const isAdmin = await isAccountAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      if (!routeToOrgMemberPublicIds && !routeToGroupsPublicIds) {
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

      const orgMemberObjects: { id: number; hasDefault: boolean }[] = [];
      const orgMemberIdsResponse =
        routeToOrgMemberPublicIds && routeToOrgMemberPublicIds.length > 0
          ? await db.query.orgMembers.findMany({
              where: inArray(orgMembers.publicId, routeToOrgMemberPublicIds),
              columns: {
                id: true
              },
              with: {
                authorizedEmailIdentities: {
                  columns: {
                    default: true
                  }
                }
              }
            })
          : [];
      orgMemberIdsResponse.forEach((orgMember) => {
        orgMemberObjects.push({
          id: orgMember.id,
          hasDefault: orgMember.authorizedEmailIdentities.some(
            (identity) => identity.default
          )
        });
      });

      const userGroupObjects: { id: number; hasDefault: boolean }[] = [];
      const userGroupIdsResponse =
        routeToGroupsPublicIds && routeToGroupsPublicIds.length > 0
          ? await db.query.groups.findMany({
              where: inArray(groups.publicId, routeToGroupsPublicIds),
              columns: {
                id: true
              },
              with: {
                authorizedEmailIdentities: {
                  columns: {
                    default: true
                  }
                }
              }
            })
          : [];
      userGroupIdsResponse.forEach((userGroup) => {
        userGroupObjects.push({
          id: userGroup.id,
          hasDefault: userGroup.authorizedEmailIdentities.some(
            (identity) => identity.default
          )
        });
      });

      // create email routing rule

      const insertEmailRoutingRule = await db.insert(emailRoutingRules).values({
        publicId: newPublicId,
        orgId: orgId,
        createdBy: org.memberId,
        name: emailUsername,
        description: `Email routing rule for ${emailUsername}@${domainResponse.domain}`
      });

      type InsertRoutingRuleDestination = InferInsertModel<
        typeof emailRoutingRulesDestinations
      >;
      // create email routing rule destinations
      const routingRuleInsertValues: InsertRoutingRuleDestination[] = [];
      if (orgMemberObjects.length > 0) {
        orgMemberObjects.forEach((orgMemberObject) => {
          routingRuleInsertValues.push({
            orgId: orgId,
            ruleId: +insertEmailRoutingRule.insertId,
            orgMemberId: orgMemberObject.id
          });
        });
      }
      if (userGroupObjects.length > 0) {
        userGroupObjects.forEach((userGroupObject) => {
          routingRuleInsertValues.push({
            orgId: orgId,
            ruleId: +insertEmailRoutingRule.insertId,
            groupId: userGroupObject.id
          });
        });
      }

      await db
        .insert(emailRoutingRulesDestinations)
        .values(routingRuleInsertValues);

      const emailIdentityPublicId = typeIdGenerator('emailIdentities');
      // create address
      const insertEmailIdentityResponse = await db
        .insert(emailIdentities)
        .values({
          publicId: emailIdentityPublicId,
          orgId: orgId,
          createdBy: org.memberId,
          username: emailUsername,
          domainName: domainResponse.domain,
          domainId: domainResponse.id,
          routingRuleId: +insertEmailRoutingRule.insertId,
          sendName: sendName,
          isCatchAll: catchAll
        });

      type InsertEmailIdentityAuthorizedOrgMembers = InferInsertModel<
        typeof emailIdentitiesAuthorizedOrgMembers
      >;
      const emailIdentityAuthorizedOrgMembersObjects: InsertEmailIdentityAuthorizedOrgMembers[] =
        [];

      if (orgMemberObjects.length > 0) {
        orgMemberObjects.forEach((orgMemberObject) => {
          emailIdentityAuthorizedOrgMembersObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            orgMemberId: orgMemberObject.id,
            default: !orgMemberObject.hasDefault
          });
        });
      }

      if (userGroupObjects.length > 0) {
        userGroupObjects.forEach((userGroupObject) => {
          emailIdentityAuthorizedOrgMembersObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            groupId: userGroupObject.id,
            default: !userGroupObject.hasDefault
          });
        });
      }

      if (emailIdentityAuthorizedOrgMembersObjects.length > 0) {
        await db
          .insert(emailIdentitiesAuthorizedOrgMembers)
          .values(emailIdentityAuthorizedOrgMembersObjects);
      }

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
        emailIdentityPublicId: typeIdValidator('emailIdentities'),
        newEmailIdentity: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
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
            authorizedOrgMembers: {
              columns: {
                orgMemberId: true,
                groupId: true,
                default: true
              },
              with: {
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
                },
                group: {
                  columns: {
                    publicId: true,
                    name: true,
                    description: true,
                    color: true
                  }
                }
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
    .query(async ({ ctx }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
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
    .query(async ({ ctx }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;
      const orgMemberId = org?.memberId || 0;
      // search for user org group memberships, get id of org group

      const userOrgGroupMembershipQuery = await db.query.groupMembers.findMany({
        where: eq(groupMembers.orgMemberId, orgMemberId),
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

      // search email routingRulesDestinations for orgMemberId or orgGroupId

      const authorizedEmailIdentities =
        await db.query.emailIdentitiesAuthorizedOrgMembers.findMany({
          where: or(
            eq(emailIdentitiesAuthorizedOrgMembers.orgMemberId, orgMemberId),
            inArray(
              emailIdentitiesAuthorizedOrgMembers.groupId,
              uniqueUserGroupIds || [0]
            )
          ),
          columns: {
            orgMemberId: true,
            groupId: true,
            default: true
          },
          with: {
            emailIdentity: {
              columns: {
                publicId: true,
                username: true,
                domainName: true,
                sendName: true
              }
            }
          }
        });

      if (!authorizedEmailIdentities.length) {
        return {
          emailIdentities: [],
          defaultEmailIdentity: undefined
        };
      }
      const defaultEmailIdentityPublicId:
        | TypeId<'emailIdentities'>
        | undefined = authorizedEmailIdentities.find(
        (emailIdentityAuthorization) =>
          emailIdentityAuthorization.default &&
          emailIdentityAuthorization.emailIdentity?.publicId
      )?.emailIdentity.publicId;
      const emailIdentities = authorizedEmailIdentities
        .map((emailIdentityAuthorization) => {
          const emailIdentity = emailIdentityAuthorization.emailIdentity;
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
        emailIdentities: emailIdentities,
        defaultEmailIdentity: defaultEmailIdentityPublicId
      };
    })
});
