import {
  orgMembers,
  spaces,
  spaceMembers,
  teamMembers,
  convos,
  convoToSpaces,
  convoEntries
} from '@u22n/database/schema';
import { router, accountProcedure, orgProcedure } from '~platform/trpc/trpc';
import { iCanHazCallerFactory } from '../orgRouter/iCanHaz/iCanHazRouter';
import { isOrgMemberSpaceMember, validateSpaceShortCode } from './utils';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { eq, and, inArray, or, desc, lt } from '@u22n/database/orm';
import { spaceSettingsRouter } from './spaceSettingsRouter';
import { spaceWorkflowsRouter } from './workflowsRouter';
import { spaceMembersRouter } from './membersRouter';
import { spaceTagsRouter } from './tagsRouter';
import { uiColors } from '@u22n/utils/colors';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const spaceRouter = router({
  members: spaceMembersRouter,
  workflows: spaceWorkflowsRouter,
  tags: spaceTagsRouter,
  settings: spaceSettingsRouter,
  getAllOrgSpaces: orgProcedure.query(async ({ ctx }) => {
    const orgSpaces = await ctx.db.query.spaces.findMany({
      where: eq(spaces.orgId, ctx.org.id),
      columns: {
        publicId: true,
        shortcode: true,
        name: true,
        description: true,
        type: true,
        avatarTimestamp: true,
        convoPrefix: true,
        inheritParentPermissions: true,
        color: true,
        icon: true,
        personalSpace: true
      },
      with: {
        parentSpace: {
          columns: {
            publicId: true
          }
        },
        subSpaces: {
          columns: {
            publicId: true
          }
        }
      }
    });
    return {
      spaces: orgSpaces
    };
  }),
  getAllOrgSpacesWithPersonalSeparately: orgProcedure.query(async ({ ctx }) => {
    const personalSpaces = await ctx.db.query.spaces.findMany({
      where: and(eq(spaces.orgId, ctx.org.id), eq(spaces.personalSpace, true)),
      columns: {
        publicId: true,
        shortcode: true,
        name: true,
        description: true,
        type: true,
        avatarTimestamp: true,
        convoPrefix: true,
        color: true,
        icon: true,
        personalSpace: true
      },
      with: {
        personalSpaceOwner: {
          columns: {
            publicId: true
          },
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
    });

    const orgSpaces = await ctx.db.query.spaces.findMany({
      where: and(eq(spaces.orgId, ctx.org.id), eq(spaces.personalSpace, false)),
      columns: {
        publicId: true,
        shortcode: true,
        name: true,
        description: true,
        type: true,
        avatarTimestamp: true,
        convoPrefix: true,
        color: true,
        icon: true
      }
    });

    return {
      personalSpaces: personalSpaces,
      orgSpaces: orgSpaces
    };
  }),

  getOrgMemberSpaces: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;

    // TODO: Optimize this query to run in one single db sql query rather than multiple
    const memberSpaceIds: number[] = [];

    const userTeamMemberships = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.orgId, org.id),
        eq(teamMembers.orgMemberId, org.memberId)
      ),
      columns: {
        teamId: true
      }
    });

    if (userTeamMemberships.length > 0) {
      const teamSpaces = await db.query.spaceMembers.findMany({
        where: and(
          eq(spaceMembers.orgId, org.id),
          inArray(
            spaceMembers.teamId,
            userTeamMemberships.map((teamMember) => teamMember.teamId)
          )
        ),
        columns: {
          spaceId: true
        }
      });
      memberSpaceIds.push(
        ...teamSpaces.map((teamMember) => teamMember.spaceId)
      );
    }

    const orgMemberSpacesMemberships = await db.query.spaceMembers.findMany({
      where: and(
        eq(spaceMembers.orgId, org.id),
        eq(spaceMembers.orgMemberId, org.memberId)
      ),
      columns: {
        spaceId: true
      }
    });
    if (orgMemberSpacesMemberships.length > 0) {
      memberSpaceIds.push(
        ...orgMemberSpacesMemberships.map((spaceMember) => spaceMember.spaceId)
      );
    }

    const spaceIdsDedupe = Array.from(new Set([...memberSpaceIds]));
    const spaceIdsSet = new Set(spaceIdsDedupe);

    const orgMemberSpacesWhere =
      spaceIdsDedupe.length === 0
        ? and(eq(spaces.orgId, org.id), eq(spaces.type, 'open'))
        : and(
            eq(spaces.orgId, org.id),
            or(eq(spaces.type, 'open'), inArray(spaces.id, spaceIdsDedupe))
          );

    const orgMemberSpaces = await db.query.spaces
      .findMany({
        where: orgMemberSpacesWhere,
        columns: {
          id: true,
          publicId: true,
          shortcode: true,
          name: true,
          description: true,
          type: true,
          avatarTimestamp: true,
          convoPrefix: true,
          inheritParentPermissions: true,
          color: true,
          icon: true,
          personalSpace: true
        },
        with: {
          parentSpace: {
            columns: {
              publicId: true
            }
          },
          subSpaces: {
            columns: {
              publicId: true
            }
          }
        }
      })
      .then((spaces) =>
        spaces.map(({ id, ...space }) => {
          // if the space is private, or the space id is in the array, then they can see Settings
          if (
            space.type === 'private' ||
            (space.type === 'open' && spaceIdsSet.has(id))
          ) {
            return { ...space, canSeeSettings: true };
          } else {
            // otherwise, they can't see Settings
            return { ...space, canSeeSettings: false };
          }
        })
      );

    const orgMemberPersonalSpaceQuery = await db.query.orgMembers.findFirst({
      where: eq(orgMembers.id, org.memberId),
      columns: {
        personalSpaceId: true
      },
      with: {
        personalSpace: {
          columns: {
            publicId: true
          }
        }
      }
    });

    return {
      spaces: orgMemberSpaces,
      personalSpaceId:
        orgMemberPersonalSpaceQuery?.personalSpace?.publicId ?? null
    };
  }),

  createNewSpace: orgProcedure
    .input(
      z.object({
        spaceName: z.string().min(1).max(128),
        spaceDescription: z.string().min(0).max(500).optional(),
        spaceColor: z.enum(uiColors),
        spaceType: z.enum(['open', 'private'])
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const { spaceName, spaceDescription, spaceColor, spaceType } = input;

      const iCanHazCaller = iCanHazCallerFactory(ctx);

      const canHazSpaces = await iCanHazCaller.space({
        orgShortcode: input.orgShortcode
      });
      if (
        (spaceType === 'private' && !canHazSpaces.private) ||
        (spaceType === 'open' && !canHazSpaces.open)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `You cannot create ${spaceType === 'private' ? 'a private' : 'an open'} on your current plan`
        });
      }

      const newSpacePublicId = typeIdGenerator('spaces');

      const validatedSpaceShortcode = await validateSpaceShortCode({
        db: db,
        shortcode: spaceName,
        orgId: org.id
      });

      const insertSpaceResponse = await db.insert(spaces).values({
        orgId: org.id,
        publicId: newSpacePublicId,
        name: spaceName,
        type: spaceType,
        color: spaceColor,
        description: spaceDescription,
        shortcode: validatedSpaceShortcode.shortcode,
        createdByOrgMemberId: Number(org.memberId)
      });

      await db.insert(spaceMembers).values({
        orgId: org.id,
        spaceId: Number(insertSpaceResponse.insertId),
        publicId: typeIdGenerator('spaceMembers'),
        orgMemberId: Number(org.memberId),
        addedByOrgMemberId: Number(org.memberId),
        role: 'admin'
      });

      return {
        spacePublicId: newSpacePublicId,
        spaceShortcode: validatedSpaceShortcode.shortcode
      };
    }),
  getSpaceDisplayProperties: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      if (input.spaceShortcode === 'all') {
        return {
          space: {
            publicId: 'all_convos',
            name: 'All Conversations',
            avatarTimestamp: null,
            color: 'cyan',
            icon: 'squares-four'
          }
        };
      }

      if (input.spaceShortcode === 'personal') {
        const orgMemberQuery = await db.query.orgMembers.findFirst({
          where: and(
            eq(orgMembers.orgId, ctx.org.id),
            eq(orgMembers.id, ctx.org.memberId)
          ),
          columns: {
            id: true
          },
          with: {
            personalSpace: {
              columns: {
                publicId: true,
                name: true,
                avatarTimestamp: true,
                color: true,
                icon: true
              }
            }
          }
        });
        return {
          space: orgMemberQuery?.personalSpace
        };
      }

      const spaceQueryResponse = await db.query.spaces.findFirst({
        where: and(
          eq(spaces.orgId, ctx.org.id),
          eq(spaces.shortcode, input.spaceShortcode)
        ),
        columns: {
          publicId: true,
          name: true,
          avatarTimestamp: true,
          color: true,
          icon: true
        }
      });

      return {
        space: spaceQueryResponse
      };
    }),

  getAccountOrgs: accountProcedure
    .input(
      z.object({
        onlyAdmin: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const whereAccountIsAdmin = input.onlyAdmin ?? false;

      const orgMembersQuery = await db.query.orgMembers.findMany({
        columns: {
          role: true
        },
        where: whereAccountIsAdmin
          ? and(
              eq(orgMembers.accountId, accountId),
              eq(orgMembers.role, 'admin')
            )
          : eq(orgMembers.accountId, accountId),
        with: {
          org: {
            columns: {
              publicId: true,
              avatarTimestamp: true,
              name: true,
              shortcode: true
            }
          }
        }
      });

      const adminOrgShortCodes = orgMembersQuery
        .filter((orgMember) => orgMember.role === 'admin')
        .map((orgMember) => orgMember.org.shortcode);

      return {
        userOrgs: orgMembersQuery,
        adminOrgShortCodes: adminOrgShortCodes
      };
    }),

  getSpaceConvos: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string(),
        // includeHidden: z.boolean().default(false),
        cursor: z
          .object({
            lastUpdatedAt: z.date().optional(),
            lastPublicId: typeIdValidator('convos').optional()
          })
          .default({})
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const { spaceShortcode, cursor } = input;
      const orgId = org.id;

      const LIMIT = 15;

      const inputLastUpdatedAt = cursor.lastUpdatedAt
        ? new Date(cursor.lastUpdatedAt)
        : new Date();

      const inputLastPublicId = cursor.lastPublicId ?? 'c_';

      const spaceIdsArray: number[] = [];

      if (spaceShortcode === 'personal') {
        const orgMemberQuery = await db.query.orgMembers.findFirst({
          where: and(
            eq(orgMembers.orgId, orgId),
            eq(orgMembers.id, org.memberId)
          ),
          columns: {
            id: true
          },
          with: {
            personalSpace: {
              columns: {
                id: true
              }
            }
          }
        });
        const spaceId = orgMemberQuery?.personalSpace?.id;

        if (!spaceId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message:
              'You dont have a personal Space set, please contact support'
          });
        }
        spaceIdsArray.push(spaceId);
      } else if (spaceShortcode === 'all') {
        const allOrgOpenSpaces = await db.query.spaces.findMany({
          where: and(eq(spaces.orgId, orgId), eq(spaces.type, 'open')),
          columns: {
            id: true
          }
        });

        allOrgOpenSpaces.map((space) => spaceIdsArray.push(space.id));

        const teamMemberships = await db.query.teamMembers.findMany({
          where: and(
            eq(teamMembers.orgId, orgId),
            eq(teamMembers.orgMemberId, org.memberId)
          ),
          columns: {
            teamId: true
          }
        });
        const allTeamIds = Array.from(
          new Set(teamMemberships.map((tm) => tm.teamId))
        );

        const orgMemberSpaceMemberSpaces = await db.query.spaceMembers.findMany(
          {
            where:
              allTeamIds.length === 0
                ? and(
                    eq(spaceMembers.orgId, orgId),
                    eq(spaceMembers.orgMemberId, org.memberId)
                  )
                : and(
                    eq(spaceMembers.orgId, orgId),
                    or(
                      eq(spaceMembers.orgMemberId, org.memberId),
                      inArray(spaceMembers.teamId, allTeamIds)
                    )
                  ),
            columns: {
              spaceId: true
            }
          }
        );

        orgMemberSpaceMemberSpaces.map((space) =>
          spaceIdsArray.push(space.spaceId)
        );
      } else {
        const spaceMembership = await isOrgMemberSpaceMember({
          db,
          orgId,
          spaceShortcode: spaceShortcode,
          orgMemberId: org.memberId
        });

        if (!spaceMembership.role && spaceMembership.type !== 'open') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not a member of this space'
          });
        }

        spaceIdsArray.push(spaceMembership.spaceId);
      }

      if (spaceIdsArray.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Space not found'
        });
      }

      // Get all convos associated with the space(s)
      const convoQueryDifferent = await db.query.convoToSpaces.findMany({
        where: inArray(convoToSpaces.spaceId, spaceIdsArray),
        columns: {
          convoId: true
        }
      });

      const convoQuery = await db.query.convos.findMany({
        orderBy: [desc(convos.lastUpdatedAt), desc(convos.publicId)],
        where: and(
          inArray(
            convos.id,
            convoQueryDifferent.map((c) => c.convoId)
          ),
          or(
            and(
              eq(convos.lastUpdatedAt, inputLastUpdatedAt),
              lt(convos.publicId, inputLastPublicId)
            ),
            lt(convos.lastUpdatedAt, inputLastUpdatedAt)
          )
        ),
        columns: {
          publicId: true,
          lastUpdatedAt: true
        },
        limit: LIMIT + 1,
        with: {
          subjects: {
            columns: {
              subject: true
            }
          },
          participants: {
            columns: {
              role: true,
              publicId: true,
              hidden: true,
              notifications: true
            },
            with: {
              orgMember: {
                columns: { publicId: true },
                with: {
                  profile: {
                    columns: {
                      publicId: true,
                      firstName: true,
                      lastName: true,
                      avatarTimestamp: true,
                      handle: true
                    }
                  }
                }
              },
              team: {
                columns: {
                  publicId: true,
                  name: true,
                  color: true,
                  avatarTimestamp: true
                }
              },
              contact: {
                columns: {
                  publicId: true,
                  name: true,
                  avatarTimestamp: true,
                  setName: true,
                  emailUsername: true,
                  emailDomain: true,
                  type: true,
                  signaturePlainText: true,
                  signatureHtml: true
                }
              }
            }
          },
          entries: {
            orderBy: [desc(convoEntries.createdAt)],
            limit: 1,
            columns: {
              bodyPlainText: true,
              type: true
            },
            with: {
              author: {
                columns: {
                  publicId: true
                },
                with: {
                  orgMember: {
                    columns: {
                      publicId: true
                    },
                    with: {
                      profile: {
                        columns: {
                          publicId: true,
                          firstName: true,
                          lastName: true,
                          avatarTimestamp: true,
                          handle: true
                        }
                      }
                    }
                  },
                  team: {
                    columns: {
                      publicId: true,
                      name: true,
                      color: true,
                      avatarTimestamp: true
                    }
                  },
                  contact: {
                    columns: {
                      publicId: true,
                      name: true,
                      avatarTimestamp: true,
                      setName: true,
                      emailUsername: true,
                      emailDomain: true,
                      type: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // As we fetch ${LIMIT + 1} convos at a time, if the length is <= ${LIMIT}, we know we've reached the end
      if (convoQuery.length <= LIMIT) {
        return {
          data: convoQuery,
          cursor: null
        };
      }

      // If we have ${LIMIT + 1} convos, we pop the last one as we return ${LIMIT} convos
      convoQuery.pop();

      const newCursorLastUpdatedAt =
        convoQuery[convoQuery.length - 1]!.lastUpdatedAt;
      const newCursorLastPublicId = convoQuery[convoQuery.length - 1]!.publicId;

      return {
        data: convoQuery,
        cursor: {
          lastUpdatedAt: newCursorLastUpdatedAt,
          lastPublicId: newCursorLastPublicId
        }
      };
    })
});
