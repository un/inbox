import {
  convos,
  convoToSpaces,
  convoWorkflows,
  orgMembers,
  spaces,
  spaceWorkflows,
  teamMembers
} from '@u22n/database/schema';
import type { SpaceMemberRole, SpaceType } from '@u22n/utils/spaces';
import { typeIdGenerator, type TypeId } from '@u22n/utils/typeid';
import { eq, and, like, inArray } from '@u22n/database/orm';
import { db, type DBType } from '@u22n/database';
import { TRPCError } from '@trpc/server';

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
  type: SpaceType;
  permissions: {
    canCreate: boolean;
    canRead: boolean;
    canComment: boolean;
    canReply: boolean;
    canDelete: boolean;
    canChangeWorkflow: boolean;
    canSetWorkflowToClosed: boolean;
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
      publicId: true,
      type: true
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
          canChangeWorkflow: true,
          canSetWorkflowToClosed: true,
          canComment: true,
          canCreate: true,
          canDelete: true,
          canMergeConvos: true,
          canMoveToAnotherSpace: true,
          canRead: true,
          canReply: true
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
    type: spaceQueryResponse.type,
    permissions: {
      canCreate: false,
      canRead: false,
      canComment: false,
      canReply: false,
      canDelete: false,
      canChangeWorkflow: false,
      canSetWorkflowToClosed: false,
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
        canChangeWorkflow:
          spaceMembershipResponse.permissions.canChangeWorkflow ||
          spaceMembership.canChangeWorkflow,
        canSetWorkflowToClosed:
          spaceMembershipResponse.permissions.canSetWorkflowToClosed ||
          spaceMembership.canSetWorkflowToClosed,
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

export async function verifySpaceMembership({
  orgId,
  spacePublicId,
  orgMemberId
}: {
  spacePublicId: TypeId<'spaces'>;
  orgId: number;
  orgMemberId: number;
}) {
  const space = await db.query.spaces.findFirst({
    where: and(eq(spaces.orgId, orgId), eq(spaces.publicId, spacePublicId)),
    columns: {
      shortcode: true
    }
  });
  if (!space) return false;
  return isOrgMemberSpaceMember({
    db,
    orgId,
    spaceShortcode: space.shortcode,
    orgMemberId
  }).then(({ permissions, role, type }) => {
    return type === 'open' ? true : role === 'admin' || permissions.canRead;
  });
}

export async function addConvoToSpace({
  db,
  orgId,
  convoId,
  spaceId,
  orgMemberId
}: {
  db: DBType;
  orgId: number;
  convoId: number;
  spaceId: number;
  orgMemberId?: number;
}) {
  // validate that the space and convo exist and belong to the same org
  const spaceQuery = await db.query.spaces.findFirst({
    where: and(eq(spaces.orgId, orgId), eq(spaces.id, spaceId)),
    columns: {
      id: true,
      createdByOrgMemberId: true
    }
  });
  if (!spaceQuery) {
    throw new Error('❌addConvoToSpace: Space not found');
  }
  const convoQuery = await db.query.convos.findFirst({
    where: and(eq(convos.orgId, orgId), eq(convos.id, convoId)),
    columns: {
      id: true
    }
  });
  if (!convoQuery) {
    throw new Error('❌addConvoToSpace: Convo not found');
  }

  // check if the convo is already in the space
  const convoToSpacesQuery = await db.query.convoToSpaces.findMany({
    where: and(
      eq(convoToSpaces.orgId, orgId),
      eq(convoToSpaces.convoId, convoId),
      eq(convoToSpaces.spaceId, spaceId)
    ),
    columns: {
      id: true
    }
  });
  if (convoToSpacesQuery.length > 0) {
    return;
  }

  // add the convo to the space
  const newConvoToSpaceInsert = await db.insert(convoToSpaces).values({
    orgId: orgId,
    convoId: convoId,
    spaceId: spaceId,
    publicId: typeIdGenerator('convoToSpaces')
  });

  // check if the space has "open" workflows
  const spaceWorkflowsQuery = await db.query.spaceWorkflows.findMany({
    where: and(
      eq(spaceWorkflows.orgId, orgId),
      eq(spaceWorkflows.spaceId, spaceId),
      eq(spaceWorkflows.type, 'open')
    ),
    columns: {
      id: true,
      disabled: true,
      order: true
    }
  });

  if (!spaceWorkflowsQuery || spaceWorkflowsQuery.length === 0) {
    return;
  }

  // check first convoWorkflow type === open
  const openWorkflows = spaceWorkflowsQuery.sort((a, b) => a.order - b.order);
  if (openWorkflows && openWorkflows.length > 0) {
    const firstOpenWorkflow = openWorkflows?.[0];
    if (firstOpenWorkflow) {
      await db.insert(convoWorkflows).values({
        orgId: orgId,
        convoId: convoId,
        spaceId: spaceId,
        convoToSpaceId: Number(newConvoToSpaceInsert.insertId),
        publicId: typeIdGenerator('convoWorkflows'),
        workflow: firstOpenWorkflow.id,
        byOrgMemberId: orgMemberId ?? spaceQuery.createdByOrgMemberId
      });
      return;
    }
  }
  return;
}
