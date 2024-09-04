import {
  orgMembers,
  domains,
  teams,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  emailIdentities,
  teamMembers,
  spaces,
  emailIdentitiesAuthorizedSenders,
  convos,
  spaceMembers
} from '@u22n/database/schema';
import {
  inferTypeId,
  typeIdGenerator,
  typeIdValidator,
  type TypeId
} from '@u22n/utils/typeid';
import {
  and,
  eq,
  inArray,
  or,
  type InferInsertModel
} from '@u22n/database/orm';
import { router, orgProcedure, orgAdminProcedure } from '~platform/trpc/trpc';
import { emailIdentityExternalRouter } from './emailIdentityExternalRouter';
import { nanoIdToken } from '@u22n/utils/zodSchemas';
import { TRPCError } from '@trpc/server';
import { db } from '@u22n/database';
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
        routeToSpacesPublicIds: z.array(typeIdValidator('spaces')),
        canSend: z.object({
          anyone: z.boolean(),
          users: z.array(typeIdValidator('orgMembers')).optional(),
          teams: z.array(typeIdValidator('teams')).optional()
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;
      const {
        domainPublicId,
        sendName,
        catchAll,
        routeToSpacesPublicIds,
        canSend
      } = input;

      const emailUsername = input.emailUsername.toLowerCase();

      // pre-checks

      if (canSend.anyone && !canSend.users && !canSend.teams) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'At least one user or team must be allowed to send'
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

      // verify email address is not already used
      const emailIdentityResponse = await db.query.emailIdentities.findFirst({
        where: and(
          eq(emailIdentities.username, emailUsername),
          eq(emailIdentities.domainId, domainResponse.id),
          eq(emailIdentities.orgId, orgId)
        ),
        columns: {
          id: true
        }
      });

      if (emailIdentityResponse) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Email address ${emailUsername + '@' + domainResponse.domain} already exists`
        });
      }

      // create email routing rule
      const newRoutingRulePublicId = typeIdGenerator('emailRoutingRules');
      const insertEmailRoutingRule = await db.insert(emailRoutingRules).values({
        publicId: newRoutingRulePublicId,
        orgId: orgId,
        createdBy: org.memberId,
        name: emailUsername,
        description: `Email routing rule for ${emailUsername}@${domainResponse.domain}`
      });

      // create email identity
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

      // create email routing rule destinations
      type InsertRoutingRuleDestination = InferInsertModel<
        typeof emailRoutingRulesDestinations
      >;
      const routingRuleInsertValues: InsertRoutingRuleDestination[] = [];

      const destinationSpaceIdsResponse = await db.query.spaces.findMany({
        where: inArray(spaces.publicId, routeToSpacesPublicIds),
        columns: {
          id: true
        }
      });

      destinationSpaceIdsResponse.forEach((space) => {
        const newRoutingRuleDestinationPublicId = typeIdGenerator(
          'emailRoutingRuleDestinations'
        );
        routingRuleInsertValues.push({
          publicId: newRoutingRuleDestinationPublicId,
          orgId: orgId,
          ruleId: +insertEmailRoutingRule.insertId,
          spaceId: space.id
        });
      });
      await db
        .insert(emailRoutingRulesDestinations)
        .values(routingRuleInsertValues);

      // create email Authorizations
      type InsertEmailIdentityAuthorizedInsert = InferInsertModel<
        typeof emailIdentitiesAuthorizedSenders
      >;
      const emailIdentityAuthorizedInsertObjects: InsertEmailIdentityAuthorizedInsert[] =
        [];

      if (canSend.anyone) {
        destinationSpaceIdsResponse.forEach((space) => {
          emailIdentityAuthorizedInsertObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            spaceId: space.id
          });
        });
      } else {
        const orgMemberIdsResponse =
          canSend.users && canSend.users.length > 0
            ? await db.query.orgMembers.findMany({
                where: inArray(orgMembers.publicId, canSend.users),
                columns: {
                  id: true,
                  defaultEmailIdentityId: true
                }
              })
            : [];

        orgMemberIdsResponse.forEach((orgMember) => {
          emailIdentityAuthorizedInsertObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            orgMemberId: orgMember.id
          });
          if (!orgMember.defaultEmailIdentityId) {
            void db
              .update(orgMembers)
              .set({
                defaultEmailIdentityId: Number(
                  insertEmailIdentityResponse.insertId
                )
              })
              .where(eq(orgMembers.id, orgMember.id));
          }
        });

        const teamIdsResponse =
          canSend.teams && canSend.teams.length > 0
            ? await db.query.teams.findMany({
                where: inArray(teams.publicId, canSend.teams),
                columns: {
                  id: true,
                  defaultEmailIdentityId: true
                }
              })
            : [];

        teamIdsResponse.forEach((team) => {
          emailIdentityAuthorizedInsertObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            teamId: team.id
          });
          if (!team.defaultEmailIdentityId) {
            void db
              .update(teams)
              .set({
                defaultEmailIdentityId: Number(
                  insertEmailIdentityResponse.insertId
                )
              })
              .where(eq(teams.id, team.id));
          }
        });
      }

      if (emailIdentityAuthorizedInsertObjects.length > 0) {
        await db
          .insert(emailIdentitiesAuthorizedSenders)
          .values(emailIdentityAuthorizedInsertObjects);
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
        emailIdentityPublicId: typeIdValidator('emailIdentities')
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
            authorizedSenders: {
              columns: {
                // we need the id as there is no other way to key the authorizedSenders
                id: true,
                orgMemberId: true,
                teamId: true,
                spaceId: true
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
                },
                space: {
                  columns: {
                    publicId: true,
                    name: true,
                    description: true,
                    color: true,
                    icon: true,
                    type: true,
                    personalSpace: true
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
                    space: {
                      columns: {
                        publicId: true,
                        avatarTimestamp: true,
                        name: true,
                        description: true,
                        color: true,
                        icon: true,
                        type: true
                      },
                      with: {
                        personalSpaceOwner: {
                          columns: {},
                          with: {
                            profile: true
                          }
                        }
                      }
                    },
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
                space: {
                  columns: {
                    publicId: true,
                    avatarTimestamp: true,
                    name: true,
                    description: true,
                    color: true
                  }
                },
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
  getUserEmailIdentities: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64).nullable().optional(),
        convoPublicId: typeIdValidator('convos').optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;
      const orgMemberId = org?.memberId || 0;
      const authorizedSpaceIds: number[] = [];

      if (input.spaceShortcode) {
        if (input.spaceShortcode === 'personal') {
          const personalSpace = await db.query.orgMembers.findFirst({
            where: eq(orgMembers.id, orgMemberId),
            columns: {
              personalSpaceId: true
            }
          });
          if (personalSpace?.personalSpaceId) {
            authorizedSpaceIds.push(personalSpace.personalSpaceId);
          }
        } else {
          const spaceQueryResponse = await db.query.spaces.findFirst({
            where: and(
              eq(spaces.orgId, orgId),
              eq(spaces.shortcode, input.spaceShortcode)
            ),
            columns: {
              id: true
            }
          });
          if (spaceQueryResponse?.id) {
            authorizedSpaceIds.push(spaceQueryResponse.id);
          }
        }
      }

      if (input.convoPublicId) {
        const convoQueryResponse = await db.query.convos.findFirst({
          where: and(
            eq(convos.publicId, input.convoPublicId),
            eq(convos.orgId, orgId)
          ),
          columns: {
            id: true
          },
          with: {
            spaces: {
              columns: {
                id: true,
                spaceId: true
              }
            }
          }
        });

        if (convoQueryResponse?.spaces) {
          convoQueryResponse.spaces.map((space) => {
            authorizedSpaceIds.push(space.id);
          });
        }
      }

      // get all space memberships for the orgMember
      if (!input.spaceShortcode) {
        const spaceMemberships = await db.query.spaceMembers.findMany({
          where: eq(spaceMembers.orgMemberId, orgMemberId),
          columns: {
            spaceId: true
          }
        });
        const orgOpenSpaces = await db.query.spaces.findMany({
          where: and(eq(spaces.orgId, orgId), eq(spaces.type, 'open')),
          columns: {
            id: true
          }
        });

        // create an array with unique spaceIds
        const allUniqueSpaceIds = Array.from(
          new Set(
            spaceMemberships
              .map((spaceMembership) => spaceMembership.spaceId)
              .concat(orgOpenSpaces.map((space) => space.id))
          )
        );
        authorizedSpaceIds.push(...allUniqueSpaceIds);
      }

      // search for user org team memberships, get id of org team

      const userOrgTeamMembershipQuery = await db.query.teamMembers.findMany({
        where: and(
          eq(teamMembers.orgId, orgId),
          eq(teamMembers.orgMemberId, orgMemberId)
        ),
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

      // search email routingRulesDestinations for spaceId or orgMemberId or orgTeamId

      const authorizedEmailIdentities =
        await db.query.emailIdentitiesAuthorizedSenders.findMany({
          where: or(
            authorizedSpaceIds.length && authorizedSpaceIds.length > 0
              ? inArray(
                  emailIdentitiesAuthorizedSenders.spaceId,
                  authorizedSpaceIds
                )
              : undefined,
            eq(emailIdentitiesAuthorizedSenders.orgMemberId, orgMemberId),
            inArray(emailIdentitiesAuthorizedSenders.teamId, uniqueUserTeamIds)
          ),
          columns: {
            orgMemberId: true,
            teamId: true,
            spaceId: true
          },
          with: {
            emailIdentity: {
              columns: {
                id: true,
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

      const orgMemberQueryResponse = await db.query.orgMembers.findFirst({
        where: eq(orgMembers.id, orgMemberId),
        columns: {
          defaultEmailIdentityId: true
        }
      });

      let defaultEmailIdentityPublicId: TypeId<'emailIdentities'> | undefined;
      if (
        orgMemberQueryResponse &&
        orgMemberQueryResponse.defaultEmailIdentityId !== undefined
      ) {
        defaultEmailIdentityPublicId =
          authorizedEmailIdentities.find(
            (emailIdentityAuthorization) =>
              emailIdentityAuthorization.emailIdentity.id ===
              orgMemberQueryResponse.defaultEmailIdentityId
          )?.emailIdentity.publicId ?? undefined;
      } else {
        defaultEmailIdentityPublicId = undefined;
      }

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
  setSendName: orgAdminProcedure
    .input(
      z.object({
        emailIdentityPublicId: typeIdValidator('emailIdentities'),
        sendName: z
          .string()
          .min(3, 'Send name must be at least 3 characters')
          .max(64, 'Send name must be at most 64 characters')
      })
    )
    .mutation(async ({ ctx, input }) => {
      const emailIdentityResponse =
        await ctx.db.query.emailIdentities.findFirst({
          where: and(
            eq(emailIdentities.publicId, input.emailIdentityPublicId),
            eq(emailIdentities.orgId, ctx.org.id)
          ),
          columns: { id: true }
        });

      if (!emailIdentityResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email identity not found'
        });
      }

      await db
        .update(emailIdentities)
        .set({
          sendName: input.sendName
        })
        .where(eq(emailIdentities.id, emailIdentityResponse.id));
    }),
  addSender: orgAdminProcedure
    .input(
      z.object({
        emailIdentityPublicId: typeIdValidator('emailIdentities'),
        sender: z.union([
          typeIdValidator('orgMembers'),
          typeIdValidator('teams'),
          typeIdValidator('spaces')
        ])
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const emailIdentityResponse = await db.query.emailIdentities.findFirst({
        where: and(
          eq(emailIdentities.publicId, input.emailIdentityPublicId),
          eq(emailIdentities.orgId, org.id)
        ),
        columns: { id: true },
        with: {
          authorizedSenders: {
            columns: {
              id: true
            },
            with: {
              orgMember: true,
              team: true,
              space: true
            }
          }
        }
      });

      if (!emailIdentityResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email identity not found'
        });
      }

      switch (inferTypeId(input.sender)) {
        case 'orgMembers':
          if (
            emailIdentityResponse.authorizedSenders.some(
              (sender) => sender.orgMember?.publicId === input.sender
            )
          ) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Org member already has access'
            });
          }

          const senderOrgMember = await db.query.orgMembers.findFirst({
            where: eq(
              orgMembers.publicId,
              input.sender as TypeId<'orgMembers'>
            ),
            columns: {
              id: true
            }
          });
          if (!senderOrgMember) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Org member not found'
            });
          }

          await db.insert(emailIdentitiesAuthorizedSenders).values({
            orgId: org.id,
            identityId: emailIdentityResponse.id,
            addedBy: org.memberId,
            orgMemberId: senderOrgMember.id
          });
          return;
        case 'teams':
          if (
            emailIdentityResponse.authorizedSenders.some(
              (sender) => sender.team?.publicId === input.sender
            )
          ) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Team already has access'
            });
          }
          const senderTeam = await db.query.teams.findFirst({
            where: eq(teams.publicId, input.sender as TypeId<'teams'>),
            columns: {
              id: true
            }
          });
          if (!senderTeam) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Team not found'
            });
          }
          await db.insert(emailIdentitiesAuthorizedSenders).values({
            orgId: org.id,
            identityId: emailIdentityResponse.id,
            addedBy: org.memberId,
            teamId: senderTeam.id
          });
          return;
        case 'spaces':
          if (
            emailIdentityResponse.authorizedSenders.some(
              (sender) => sender.space?.publicId === input.sender
            )
          ) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Space already has access'
            });
          }
          const senderSpace = await db.query.spaces.findFirst({
            where: eq(spaces.publicId, input.sender as TypeId<'spaces'>),
            columns: {
              id: true
            }
          });
          if (!senderSpace) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Space not found'
            });
          }
          await db.insert(emailIdentitiesAuthorizedSenders).values({
            orgId: org.id,
            identityId: emailIdentityResponse.id,
            addedBy: org.memberId,
            spaceId: senderSpace.id
          });
          return;
      }
    }),
  removeSender: orgAdminProcedure
    .input(
      z.object({
        emailIdentityPublicId: typeIdValidator('emailIdentities'),
        sender: z.union([
          typeIdValidator('orgMembers'),
          typeIdValidator('teams'),
          typeIdValidator('spaces')
        ])
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const emailIdentityResponse = await db.query.emailIdentities.findFirst({
        where: and(
          eq(emailIdentities.publicId, input.emailIdentityPublicId),
          eq(emailIdentities.orgId, org.id)
        ),
        columns: { id: true },
        with: {
          authorizedSenders: {
            columns: {
              id: true
            },
            with: {
              orgMember: true,
              team: true,
              space: true
            }
          }
        }
      });

      if (!emailIdentityResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email identity not found'
        });
      }

      switch (inferTypeId(input.sender)) {
        case 'orgMembers':
          if (
            !emailIdentityResponse.authorizedSenders.some(
              (sender) => sender.orgMember?.publicId === input.sender
            )
          ) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Org member does not have access'
            });
          }
          const senderOrgMember = await db.query.orgMembers.findFirst({
            where: eq(
              orgMembers.publicId,
              input.sender as TypeId<'orgMembers'>
            ),
            columns: {
              id: true
            }
          });
          if (!senderOrgMember) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Org member not found'
            });
          }
          await db
            .delete(emailIdentitiesAuthorizedSenders)
            .where(
              and(
                eq(emailIdentitiesAuthorizedSenders.orgId, org.id),
                eq(
                  emailIdentitiesAuthorizedSenders.identityId,
                  emailIdentityResponse.id
                ),
                eq(
                  emailIdentitiesAuthorizedSenders.orgMemberId,
                  senderOrgMember.id
                )
              )
            );
          return;
        case 'teams':
          if (
            !emailIdentityResponse.authorizedSenders.some(
              (sender) => sender.team?.publicId === input.sender
            )
          ) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Team does not have access'
            });
          }
          const senderTeam = await db.query.teams.findFirst({
            where: eq(teams.publicId, input.sender as TypeId<'teams'>),
            columns: {
              id: true
            }
          });
          if (!senderTeam) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Team not found'
            });
          }
          await db
            .delete(emailIdentitiesAuthorizedSenders)
            .where(
              and(
                eq(emailIdentitiesAuthorizedSenders.orgId, org.id),
                eq(
                  emailIdentitiesAuthorizedSenders.identityId,
                  emailIdentityResponse.id
                ),
                eq(emailIdentitiesAuthorizedSenders.teamId, senderTeam.id)
              )
            );
          return;
        case 'spaces':
          if (
            !emailIdentityResponse.authorizedSenders.some(
              (sender) => sender.space?.publicId === input.sender
            )
          ) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Space does not have access'
            });
          }
          const senderSpace = await db.query.spaces.findFirst({
            where: eq(spaces.publicId, input.sender as TypeId<'spaces'>),
            columns: {
              id: true
            }
          });
          if (!senderSpace) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Space not found'
            });
          }
          await db
            .delete(emailIdentitiesAuthorizedSenders)
            .where(
              and(
                eq(emailIdentitiesAuthorizedSenders.orgId, org.id),
                eq(
                  emailIdentitiesAuthorizedSenders.identityId,
                  emailIdentityResponse.id
                ),
                eq(emailIdentitiesAuthorizedSenders.spaceId, senderSpace.id)
              )
            );
          return;
      }
    }),
  addDestination: orgAdminProcedure
    .input(
      z.object({
        emailIdentityPublicId: typeIdValidator('emailIdentities'),
        destination: typeIdValidator('spaces')
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const emailIdentityResponse = await db.query.emailIdentities.findFirst({
        where: and(
          eq(emailIdentities.publicId, input.emailIdentityPublicId),
          eq(emailIdentities.orgId, org.id)
        ),
        columns: { id: true },
        with: {
          routingRules: {
            columns: { id: true },
            with: {
              destinations: {
                columns: {
                  publicId: true
                },
                with: {
                  space: true
                }
              }
            }
          }
        }
      });

      if (!emailIdentityResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email identity not found'
        });
      }

      if (
        emailIdentityResponse.routingRules.destinations.some(
          (dest) => dest.space?.publicId === input.destination
        )
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Space is already a destination'
        });
      }

      const spaceQuery = await db.query.spaces.findFirst({
        where: eq(spaces.publicId, input.destination),
        columns: {
          id: true
        }
      });

      if (!spaceQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Space not found'
        });
      }

      await db.insert(emailRoutingRulesDestinations).values({
        orgId: org.id,
        ruleId: emailIdentityResponse.routingRules.id,
        spaceId: spaceQuery.id,
        publicId: typeIdGenerator('emailRoutingRuleDestinations')
      });
    }),
  removeDestination: orgAdminProcedure
    .input(
      z.object({
        emailIdentityPublicId: typeIdValidator('emailIdentities'),
        destination: typeIdValidator('spaces')
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const emailIdentityResponse = await db.query.emailIdentities.findFirst({
        where: and(
          eq(emailIdentities.publicId, input.emailIdentityPublicId),
          eq(emailIdentities.orgId, org.id)
        ),
        columns: { id: true },
        with: {
          routingRules: {
            columns: { id: true },
            with: {
              destinations: {
                columns: {
                  publicId: true
                },
                with: {
                  space: true
                }
              }
            }
          }
        }
      });

      if (!emailIdentityResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email identity not found'
        });
      }

      if (
        !emailIdentityResponse.routingRules.destinations.some(
          (dest) => dest.space?.publicId === input.destination
        )
      ) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Space is not a destination'
        });
      }

      if (emailIdentityResponse.routingRules.destinations.length === 1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cannot remove last destination'
        });
      }

      const spaceQuery = await db.query.spaces.findFirst({
        where: eq(spaces.publicId, input.destination),
        columns: {
          id: true
        }
      });

      if (!spaceQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Space not found'
        });
      }
      await db
        .delete(emailRoutingRulesDestinations)
        .where(
          and(
            eq(emailRoutingRulesDestinations.orgId, org.id),
            eq(
              emailRoutingRulesDestinations.ruleId,
              emailIdentityResponse.routingRules.id
            ),
            eq(emailRoutingRulesDestinations.spaceId, spaceQuery.id)
          )
        );
    })
});
