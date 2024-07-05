import {
  orgs,
  orgMembers,
  orgMemberProfiles,
  accounts,
  spaces,
  spaceMembers,
  teamMembers
} from '@u22n/database/schema';
import { router, accountProcedure, orgProcedure } from '~platform/trpc/trpc';
import { iCanHazCallerFactory } from '../orgRouter/iCanHaz/iCanHazRouter';
import { eq, and, like, inArray, or } from '@u22n/database/orm';
import { spaceSettingsRouter } from './spaceSettingsRouter';
import { spaceStatusesRouter } from './statusesRouter';
import { typeIdGenerator } from '@u22n/utils/typeid';
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
    })
});
