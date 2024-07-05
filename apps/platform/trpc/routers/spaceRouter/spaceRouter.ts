import { z } from 'zod';
import { router, accountProcedure, orgProcedure } from '~platform/trpc/trpc';
import type { DBType } from '@u22n/database';
import { eq, and, like, desc, inArray, or } from '@u22n/database/orm';
import {
  orgs,
  orgMembers,
  orgMemberProfiles,
  accounts,
  spaces,
  spaceMembers,
  teamMembers
} from '@u22n/database/schema';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { TRPCError } from '@trpc/server';
import { spaceMemberRouter } from './spaceMemberRouter';

// Find a user's personal space
export async function personalSpaceLookup({
  db,
  orgId,
  accountId
}: {
  db: DBType;
  orgId: number;
  accountId: number;
}): Promise<{ shortcode: string; spaceId: number } | null> {
  const orgMemberQuery = await db.query.orgMembers.findFirst({
    where: and(
      eq(orgMembers.orgId, orgId),
      eq(orgMembers.accountId, accountId)
    ),
    columns: {
      id: true
    },
    with: {
      personalSpace: {
        columns: {
          id: true,
          shortcode: true
        }
      }
    }
  });

  if (!orgMemberQuery || !orgMemberQuery.personalSpace) {
    return null;
  }

  return {
    spaceId: orgMemberQuery.personalSpace.id,
    shortcode: orgMemberQuery.personalSpace.shortcode
  };
}

export async function validateSpaceShortCode({
  db,
  shortcode,
  orgId,
  spaceId
}: {
  db: DBType;
  shortcode: string;
  orgId: number;
  spaceId?: number;
}): Promise<{
  shortcode: string;
}> {
  const lowerShortcode = shortcode.toLowerCase();
  //check if the shortcode is the same as the existing space own current shortcode
  if (spaceId) {
    const existingSpace = await db.query.spaces.findFirst({
      where: and(eq(spaces.orgId, orgId), eq(spaces.id, spaceId)),
      columns: {
        id: true,
        shortcode: true
      }
    });

    if (existingSpace) {
      if (existingSpace.shortcode === lowerShortcode) {
        return {
          shortcode: lowerShortcode
        };
      }
    }
  }

  const existingSpaces = await db.query.spaces.findMany({
    where: and(
      eq(spaces.orgId, orgId),
      like(spaces.shortcode, `${lowerShortcode}%`)
    ),
    columns: {
      id: true,
      shortcode: true
    }
  });

  if (existingSpaces.length === 0) {
    return {
      shortcode: lowerShortcode
    };
  }

  const existingShortcodes = existingSpaces.map((space) => space.shortcode);

  let currentSuffix = existingSpaces.length;
  let retries = 0;
  let validatedShortcode = `${lowerShortcode}-${currentSuffix}`;
  while (retries < 30) {
    if (existingShortcodes.includes(validatedShortcode)) {
      retries++;
      currentSuffix++;
      validatedShortcode = `${lowerShortcode}-${currentSuffix}`;
      continue;
    }
    break;
  }

  return {
    shortcode: validatedShortcode
  };
}

export const spaceRouter = router({
  members: spaceMemberRouter,
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

  createNewSpace: accountProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32),
        orgShortCode: z
          .string()
          .min(5)
          .max(64)
          .regex(/^[a-z0-9]*$/, {
            message: 'Only lowercase letters and numbers'
          })
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const newOrgPublicId = typeIdGenerator('org');

      const insertOrgResponse = await db.insert(orgs).values({
        ownerId: accountId,
        name: input.orgName,
        shortcode: input.orgShortCode,
        publicId: newOrgPublicId
      });
      const orgId = Number(insertOrgResponse.insertId);

      const { username } =
        (await db.query.accounts.findFirst({
          where: eq(accounts.id, accountId),
          columns: {
            username: true
          }
        })) || {};

      if (!username) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found. Please contact support.'
        });
      }

      const newOrgMemberProfileInsert = await db
        .insert(orgMemberProfiles)
        .values({
          orgId: orgId,
          publicId: typeIdGenerator('orgMemberProfile'),
          accountId: accountId,
          firstName: username,
          lastName: '',
          handle: username,
          title: '',
          blurb: ''
        });

      const newOrgMemberPublicId = typeIdGenerator('orgMembers');
      const orgMemberResponse = await db.insert(orgMembers).values({
        orgId: orgId,
        publicId: newOrgMemberPublicId,
        role: 'admin',
        accountId: accountId,
        status: 'active',
        orgMemberProfileId: Number(newOrgMemberProfileInsert.insertId)
      });

      const newSpaceResponse = await db.insert(spaces).values({
        orgId: orgId,
        publicId: typeIdGenerator('spaces'),
        name: 'Personal',
        type: 'private',
        personalSpace: true,
        color: 'cyan',
        icon: 'house',
        createdByOrgMemberId: Number(orgMemberResponse.insertId),
        shortcode: `${username}-personal`
      });

      await db.insert(spaceMembers).values({
        orgId: orgId,
        spaceId: Number(newSpaceResponse.insertId),
        publicId: typeIdGenerator('spaceMembers'),
        orgMemberId: Number(orgMemberResponse.insertId),
        addedByOrgMemberId: Number(orgMemberResponse.insertId),
        role: 'admin',
        canCreate: true,
        canRead: true,
        canComment: true,
        canReply: true,
        canDelete: true,
        canChangeStatus: true,
        canSetStatusToClosed: true,
        canAddTags: true,
        canMoveToAnotherSpace: true,
        canAddToAnotherSpace: true,
        canMergeConvos: true,
        canAddParticipants: true
      });

      await db
        .update(orgMembers)
        .set({
          personalSpaceId: Number(newSpaceResponse.insertId)
        })
        .where(eq(orgMembers.id, Number(orgMemberResponse.insertId)));

      return {
        orgId: newOrgPublicId,
        orgName: input.orgName
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

      const whereAccountIsAdmin = input.onlyAdmin || false;

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
