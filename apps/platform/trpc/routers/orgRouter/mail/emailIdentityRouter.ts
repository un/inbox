import {
  orgMembers,
  domains,
  teams,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  emailIdentities,
  teamMembers,
  emailIdentitiesAuthorizedOrgMembers
} from '@u22n/database/schema';
import {
  and,
  eq,
  inArray,
  or,
  type InferInsertModel
} from '@u22n/database/orm';
import {
  typeIdGenerator,
  typeIdValidator,
  type TypeId
} from '@u22n/utils/typeid';
import { router, orgProcedure, orgAdminProcedure } from '~platform/trpc/trpc';
import { emailIdentityExternalRouter } from './emailIdentityExternalRouter';
import { nanoIdToken } from '@u22n/utils/zodSchemas';
import { TRPCError } from '@trpc/server';
import { env } from '~platform/env';
import { z } from 'zod';

export const emailIdentityRouter = router({
  external: emailIdentityExternalRouter,
  checkEmailAvailability: orgProcedure
    .input(
      z.object({
        emailUsername: z
          .string()
          .min(1)
          .max(255)
          .regex(/^[a-zA-Z0-9._-]*$/, {
            message: 'Only letters, numbers, dots, hyphens and underscores'
          }),
        domainPublicId: typeIdValidator('domains')
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;

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
  createNewEmailIdentity: orgAdminProcedure
    .input(
      z.object({
        emailUsername: z
          .string()
          .min(1)
          .max(255)
          .regex(/^[a-zA-Z0-9._-]*$/, {
            message: 'Only letters, numbers, dots, hyphens and underscores'
          }),
        domainPublicId: typeIdValidator('domains'),
        sendName: z.string().min(2).max(255),
        catchAll: z.boolean().optional().default(false),
        routeToOrgMemberPublicIds: z
          .array(typeIdValidator('orgMembers'))
          .optional(),
        routeToTeamsPublicIds: z.array(typeIdValidator('teams')).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;
      const {
        domainPublicId,
        sendName,
        catchAll,
        routeToOrgMemberPublicIds,
        routeToTeamsPublicIds
      } = input;

      const emailUsername = input.emailUsername.toLowerCase();

      if (!routeToOrgMemberPublicIds && !routeToTeamsPublicIds) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must route to at least one user or team'
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

      const userTeamObjects: { id: number; hasDefault: boolean }[] = [];
      const userTeamIdsResponse =
        routeToTeamsPublicIds && routeToTeamsPublicIds.length > 0
          ? await db.query.teams.findMany({
              where: inArray(teams.publicId, routeToTeamsPublicIds),
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
      userTeamIdsResponse.forEach((userTeam) => {
        userTeamObjects.push({
          id: userTeam.id,
          hasDefault: userTeam.authorizedEmailIdentities.some(
            (identity) => identity.default
          )
        });
      });

      // create email routing rule
      const newRoutingRulePublicId = typeIdGenerator('emailRoutingRules');
      const insertEmailRoutingRule = await db.insert(emailRoutingRules).values({
        publicId: newRoutingRulePublicId,
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
          const newRoutingRuleDestinationPublicId = typeIdGenerator(
            'emailRoutingRuleDestinations'
          );
          routingRuleInsertValues.push({
            publicId: newRoutingRuleDestinationPublicId,
            orgId: orgId,
            ruleId: +insertEmailRoutingRule.insertId,
            orgMemberId: orgMemberObject.id
          });
        });
      }
      if (userTeamObjects.length > 0) {
        userTeamObjects.forEach((userTeamObject) => {
          const newRoutingRuleDestinationPublicId = typeIdGenerator(
            'emailRoutingRuleDestinations'
          );
          routingRuleInsertValues.push({
            publicId: newRoutingRuleDestinationPublicId,
            orgId: orgId,
            ruleId: +insertEmailRoutingRule.insertId,
            teamId: userTeamObject.id
          });
        });
      }

      await db
        .insert(emailRoutingRulesDestinations)
        .values(routingRuleInsertValues);

      // create address
      const emailIdentityPublicId = typeIdGenerator('emailIdentities');
      const mailDomains = env.MAIL_DOMAINS;
      const fwdDomain = mailDomains.fwd[0];
      const newForwardingAddress = `${nanoIdToken()}@${fwdDomain}`;
      const insertEmailIdentityResponse = await db
        .insert(emailIdentities)
        .values({
          publicId: emailIdentityPublicId,
          orgId: orgId,
          createdBy: org.memberId,
          username: emailUsername,
          domainName: domainResponse.domain,
          domainId: domainResponse.id,
          routingRuleId: Number(insertEmailRoutingRule.insertId),
          forwardingAddress: newForwardingAddress,
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

      if (userTeamObjects.length > 0) {
        userTeamObjects.forEach((userTeamObject) => {
          emailIdentityAuthorizedOrgMembersObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            teamId: userTeamObject.id,
            default: !userTeamObject.hasDefault
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
      const { db, org } = ctx;
      const orgId = org.id;
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
            isCatchAll: true,
            forwardingAddress: true
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
                teamId: true,
                default: true
              },
              with: {
                orgMember: {
                  with: {
                    profile: {
                      columns: {
                        publicId: true,
                        avatarTimestamp: true,
                        firstName: true,
                        lastName: true,
                        handle: true,
                        title: true
                      }
                    }
                  }
                },
                team: {
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
                    team: {
                      columns: {
                        publicId: true,
                        avatarTimestamp: true,
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
                            avatarTimestamp: true,
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
  getOrgEmailIdentities: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;
    const orgId = org.id;

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
                team: {
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
  getUserEmailIdentities: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;
    const orgId = org.id;
    const orgMemberId = org?.memberId || 0;
    // search for user org team memberships, get id of org team

    const userOrgTeamMembershipQuery = await db.query.teamMembers.findMany({
      where: eq(teamMembers.orgMemberId, orgMemberId),
      columns: {
        teamId: true
      },
      with: {
        team: {
          columns: {
            id: true,
            orgId: true
          }
        }
      }
    });

    const orgTeamIds = userOrgTeamMembershipQuery.filter(
      (userOrgTeamMembership) => userOrgTeamMembership.team.orgId === orgId
    );

    const userTeamIds = orgTeamIds.map((orgTeamIds) => orgTeamIds.team.id);
    const uniqueUserTeamIds = [...new Set(userTeamIds)];

    if (!uniqueUserTeamIds.length) {
      uniqueUserTeamIds.push(0);
    }

    // search email routingRulesDestinations for orgMemberId or orgTeamId

    const authorizedEmailIdentities =
      await db.query.emailIdentitiesAuthorizedOrgMembers.findMany({
        where: or(
          eq(emailIdentitiesAuthorizedOrgMembers.orgMemberId, orgMemberId),
          inArray(emailIdentitiesAuthorizedOrgMembers.teamId, uniqueUserTeamIds)
        ),
        columns: {
          orgMemberId: true,
          teamId: true,
          default: true
        },
        with: {
          emailIdentity: {
            columns: {
              publicId: true,
              username: true,
              domainName: true,
              sendName: true
            },
            with: {
              domain: {
                columns: {
                  domainStatus: true,
                  sendingMode: true
                }
              }
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
    const defaultEmailIdentityPublicId: TypeId<'emailIdentities'> | undefined =
      authorizedEmailIdentities.find((emailIdentityAuthorization) =>
        emailIdentityAuthorization.default &&
        emailIdentityAuthorization.emailIdentity?.publicId &&
        emailIdentityAuthorization.emailIdentity.domain
          ? emailIdentityAuthorization.emailIdentity.domain.domainStatus ===
              'active' &&
            emailIdentityAuthorization.emailIdentity.domain.sendingMode !==
              'disabled'
          : true
      )?.emailIdentity.publicId;

    const emailIdentities = authorizedEmailIdentities
      .map((emailIdentityAuthorization) => {
        const emailIdentity = emailIdentityAuthorization.emailIdentity;
        const sendingEnabled = emailIdentity?.domain
          ? emailIdentity.domain.domainStatus === 'active' &&
            emailIdentity.domain.sendingMode !== 'disabled'
          : true;
        return {
          publicId: emailIdentity.publicId,
          username: emailIdentity.username,
          domainName: emailIdentity.domainName,
          sendName: emailIdentity.sendName,
          sendingEnabled
        };
      })
      .filter(
        (identity, index, self) =>
          index === self.findIndex((t) => t.publicId === identity.publicId)
      );

    return {
      emailIdentities: emailIdentities,
      defaultEmailIdentity: defaultEmailIdentityPublicId
    };
  }),
  userHasEmailIdentities: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;
    const orgId = org.id;
    const orgMemberId = org?.memberId || 0;
    // search for user org team memberships, get id of org team

    const userOrgTeamMembershipQuery = await db.query.teamMembers.findMany({
      where: eq(teamMembers.orgMemberId, orgMemberId),
      columns: {
        teamId: true
      },
      with: {
        team: {
          columns: {
            id: true,
            orgId: true
          }
        }
      }
    });

    const orgTeamIds = userOrgTeamMembershipQuery.filter(
      (userOrgTeamMembership) => userOrgTeamMembership.team.orgId === orgId
    );

    const userTeamIds = orgTeamIds.map((orgTeamIds) => orgTeamIds.team.id);
    const uniqueUserTeamIds = [...new Set(userTeamIds)];

    if (!uniqueUserTeamIds.length) {
      uniqueUserTeamIds.push(0);
    }

    // search email routingRulesDestinations for orgMemberId or orgTeamId

    const authorizedEmailIdentities =
      await db.query.emailIdentitiesAuthorizedOrgMembers.findMany({
        where: or(
          eq(emailIdentitiesAuthorizedOrgMembers.orgMemberId, orgMemberId),
          inArray(
            emailIdentitiesAuthorizedOrgMembers.teamId,
            uniqueUserTeamIds || [0]
          )
        ),
        columns: {
          orgMemberId: true,
          teamId: true,
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
        hasIdentity: false
      };
    }
    return {
      hasIdentity: true
    };
  })
});
