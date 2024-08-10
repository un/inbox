import {
  orgs,
  orgMembers,
  orgMemberProfiles,
  accounts,
  spaces,
  spaceMembers,
  teamMembers,
  convos,
  convoToSpaces,
  convoParticipants,
  convoEntries
} from '@u22n/database/schema';
import { router, accountProcedure, orgProcedure } from '~platform/trpc/trpc';
import { iCanHazCallerFactory } from '../orgRouter/iCanHaz/iCanHazRouter';
import { eq, and, like, inArray, or, desc, lt } from '@u22n/database/orm';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { spaceSettingsRouter } from './spaceSettingsRouter';
import { spaceStatusesRouter } from './statusesRouter';
import { spaceMembersRouter } from './membersRouter';
import { validateSpaceShortCode } from './utils';
import { spaceTagsRouter } from './tagsRouter';
import { uiColors } from '@u22n/utils/colors';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const spaceRouter = router({
  members: spaceMembersRouter,
  statuses: spaceStatusesRouter,
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

    const orgMemberSpaces = await db.query.spaces.findMany({
      where: and(
        eq(spaces.orgId, org.id),
        or(eq(spaces.type, 'open'), inArray(spaces.id, spaceIdsDedupe))
      ),
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
      const { db, account, org } = ctx;
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
        spaceShortCode: z.string(),
        includeHidden: z.boolean().default(false),
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
      const { spaceShortCode, includeHidden, cursor } = input;
      const orgId = org.id;

      const orgMemberId = org.memberId;
      const LIMIT = 15;

      const inputLastUpdatedAt = cursor.lastUpdatedAt
        ? new Date(cursor.lastUpdatedAt)
        : new Date();

      const inputLastPublicId = cursor.lastPublicId ?? 'c_';

      // First, get the space ID from the shortcode
      const space = await db.query.spaces.findFirst({
        where: and(
          eq(spaces.orgId, orgId),
          eq(spaces.shortcode, spaceShortCode)
        ),
        columns: {
          id: true
        }
      });

      if (!space) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Space not found'
        });
      }
      console.log('space', space);
      // make a another queryy that is more simple to find out why it does not return anything
      // Fix the syntax error and use the space.id
      const convoQueryDifferent = await db.query.convoToSpaces.findMany({
        where: eq(convoToSpaces.spaceId, space.id),
        columns: {
          convoId: true
        },
        with: {
          convo: {
            columns: {
              publicId: true
            }
          }
        }
      });

      // Get all convos associated with the space
      console.log('convoQueryDifferent', convoQueryDifferent);
      const convoQuery = await db.query.convos.findMany({
        orderBy: [desc(convos.lastUpdatedAt), desc(convos.publicId)],
        where: inArray(
          convos.id,
          convoQueryDifferent.map((c) => c.convoId)
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
      console.log('convoQuery', convoQuery);

      // As we fetch ${LIMIT + 1} convos at a time, if the length is <= ${LIMIT}, we know we've reached the end
      if (convoQuery.length <= LIMIT) {
        return {
          data: convoQuery,
          cursor: null
        };
      }

      console.log('before convoQuery', convoQuery);
      // If we have ${LIMIT + 1} convos, we pop the last one as we return ${LIMIT} convos
      convoQuery.pop();

      const newCursorLastUpdatedAt =
        convoQuery[convoQuery.length - 1]!.lastUpdatedAt;
      const newCursorLastPublicId = convoQuery[convoQuery.length - 1]!.publicId;
      console.log('newCursorLastUpdatedAt', newCursorLastUpdatedAt);
      console.log('newCursorLastPublicId', newCursorLastPublicId);
      console.log('convoQuery', convoQuery);

      return {
        data: convoQuery,
        cursor: {
          lastUpdatedAt: newCursorLastUpdatedAt,
          lastPublicId: newCursorLastPublicId
        }
      };
    })
});
