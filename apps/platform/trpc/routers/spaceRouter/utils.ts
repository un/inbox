import { orgMembers, spaces, teamMembers, teams } from '@u22n/database/schema';
import { eq, and, like, inArray } from '@u22n/database/orm';
import type { SpaceMemberRole } from '@u22n/utils/spaces';
import type { TypeId } from '@u22n/utils/typeid';
import type { DBType } from '@u22n/database';
import { TRPCError } from '@trpc/server';
import type { TypeOf } from 'zod';

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

  if (!orgMemberQuery?.personalSpace) {
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
  const cleanedShortcode = shortcode.toLowerCase().replace(/[^a-z0-9]/g, '');
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
      if (existingSpace.shortcode === cleanedShortcode) {
        return {
          shortcode: cleanedShortcode
        };
      }
    }
  }

  const existingSpaces = await db.query.spaces.findMany({
    where: and(
      eq(spaces.orgId, orgId),
      like(spaces.shortcode, `${cleanedShortcode}%`)
    ),
    columns: {
      id: true,
      shortcode: true
    }
  });

  if (existingSpaces.length === 0) {
    return {
      shortcode: cleanedShortcode
    };
  }

  const existingShortcodes = existingSpaces.map((space) => space.shortcode);

  let currentSuffix = existingSpaces.length;
  let retries = 0;
  let validatedShortcode = `${cleanedShortcode}${currentSuffix}`;
  while (retries < 30) {
    if (existingShortcodes.includes(validatedShortcode)) {
      retries++;
      currentSuffix++;
      validatedShortcode = `${cleanedShortcode}${currentSuffix}`;
      continue;
    }
    break;
  }

  return {
    shortcode: validatedShortcode
  };
}

type IsOrgMemberSpaceMemberResponse = {
  role: SpaceMemberRole | null;
  spaceId: number;
  permissions: {
    canCreate: boolean;
    canRead: boolean;
    canComment: boolean;
    canReply: boolean;
    canDelete: boolean;
    canChangeStatus: boolean;
    canSetStatusToClosed: boolean;
    canAddTags: boolean;
    canMoveToAnotherSpace: boolean;
    canAddToAnotherSpace: boolean;
    canMergeConvos: boolean;
    canAddParticipants: boolean;
  };
};

export async function isOrgMemberSpaceMember({
  db,
  orgId,
  spaceShortcode,
  orgMemberId
}: {
  db: DBType;
  orgId: number;
  spaceShortcode: string;
  orgMemberId: number;
}): Promise<IsOrgMemberSpaceMemberResponse> {
  const spaceQueryResponse = await db.query.spaces.findFirst({
    where: and(eq(spaces.orgId, orgId), eq(spaces.shortcode, spaceShortcode)),
    columns: {
      id: true,
      publicId: true
    },
    with: {
      members: {
        columns: {
          id: true,
          publicId: true,
          role: true,
          orgMemberId: true,
          teamId: true,
          canAddParticipants: true,
          canAddTags: true,
          canAddToAnotherSpace: true,
          canChangeStatus: true,
          canComment: true,
          canCreate: true,
          canDelete: true,
          canMergeConvos: true,
          canMoveToAnotherSpace: true,
          canRead: true,
          canReply: true,
          canSetStatusToClosed: true
        }
      }
    }
  });

  if (!spaceQueryResponse) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Space not found'
    });
  }

  type SpaceMembership = (typeof spaceQueryResponse.members)[number];

  const allSpaceMemberships: SpaceMembership[] =
    spaceQueryResponse.members.filter(
      (member) => member.orgMemberId === orgMemberId
    );

  const preTeamSpaceMemberships: SpaceMembership[] =
    spaceQueryResponse.members.filter((member) => member.teamId !== null);

  if (preTeamSpaceMemberships.length > 0) {
    const teamSpaceMembershipTeamIds = preTeamSpaceMemberships
      .map((member) => member.teamId)
      .filter((teamId) => teamId !== null);
    const teamMemberQueryResponse = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.orgId, orgId),
        inArray(teamMembers.teamId, teamSpaceMembershipTeamIds),
        eq(teamMembers.orgMemberId, orgMemberId)
      ),
      columns: {
        teamId: true
      }
    });

    if (teamMemberQueryResponse.length !== 0) {
      const filteredTeamSpaceMemberships = preTeamSpaceMemberships.filter(
        (preTeamSpaceMembership) =>
          teamMemberQueryResponse.find(
            (teamMember) => teamMember.teamId === preTeamSpaceMembership.teamId
          )
      );
      allSpaceMemberships.push(...filteredTeamSpaceMemberships);
    }
  }

  const spaceMembershipResponse: IsOrgMemberSpaceMemberResponse = {
    role: null,
    spaceId: spaceQueryResponse.id,
    permissions: {
      canCreate: false,
      canRead: false,
      canComment: false,
      canReply: false,
      canDelete: false,
      canChangeStatus: false,
      canSetStatusToClosed: false,
      canAddTags: false,
      canMoveToAnotherSpace: false,
      canAddToAnotherSpace: false,
      canMergeConvos: false,
      canAddParticipants: false
    }
  };

  if (allSpaceMemberships.length !== 0) {
    for (const spaceMembership of allSpaceMemberships) {
      if (!spaceMembershipResponse.role || spaceMembership.role === 'admin')
        spaceMembershipResponse.role = spaceMembership.role;

      // for each of the permissions, if the membership permission is true, set the permission to true else, set it to previous value
      spaceMembershipResponse.permissions = {
        canCreate:
          spaceMembershipResponse.permissions.canCreate ||
          spaceMembership.canCreate,
        canRead:
          spaceMembershipResponse.permissions.canRead ||
          spaceMembership.canRead,
        canComment:
          spaceMembershipResponse.permissions.canComment ||
          spaceMembership.canComment,
        canReply:
          spaceMembershipResponse.permissions.canReply ||
          spaceMembership.canReply,
        canDelete:
          spaceMembershipResponse.permissions.canDelete ||
          spaceMembership.canDelete,
        canChangeStatus:
          spaceMembershipResponse.permissions.canChangeStatus ||
          spaceMembership.canChangeStatus,
        canSetStatusToClosed:
          spaceMembershipResponse.permissions.canSetStatusToClosed ||
          spaceMembership.canSetStatusToClosed,
        canAddTags:
          spaceMembershipResponse.permissions.canAddTags ||
          spaceMembership.canAddTags,
        canMoveToAnotherSpace:
          spaceMembershipResponse.permissions.canMoveToAnotherSpace ||
          spaceMembership.canMoveToAnotherSpace,
        canAddToAnotherSpace:
          spaceMembershipResponse.permissions.canAddToAnotherSpace ||
          spaceMembership.canAddToAnotherSpace,
        canMergeConvos:
          spaceMembershipResponse.permissions.canMergeConvos ||
          spaceMembership.canMergeConvos,
        canAddParticipants:
          spaceMembershipResponse.permissions.canAddParticipants ||
          spaceMembership.canAddParticipants
      };
    }
  }

  return spaceMembershipResponse;
}
