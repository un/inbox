import {
  convoParticipantTeamMembers,
  convoParticipants,
  teamMembers,
  teams,
  orgMembers
} from '@u22n/database/schema';
import { typeIdGenerator, type TypeId } from '@u22n/utils/typeid';
import { and, eq } from '@u22n/database/orm';
import type { DBType } from '@u22n/database';
import { TRPCError } from '@trpc/server';

export async function addOrgMemberToTeamHandler(
  db: DBType,
  {
    orgId,
    orgMemberId,
    orgMemberPublicId,
    teamPublicId
  }: {
    orgId: number;
    orgMemberId: number;
    orgMemberPublicId: TypeId<'orgMembers'>;
    teamPublicId: TypeId<'teams'>;
  }
) {
  const orgMember = await db.query.orgMembers.findFirst({
    columns: {
      id: true,
      orgMemberProfileId: true
    },
    where: and(
      eq(orgMembers.orgId, orgId),
      eq(orgMembers.publicId, orgMemberPublicId)
    )
  });

  if (!orgMember) {
    throw new Error('User not found');
  }

  const teamQuery = await db.query.teams.findFirst({
    columns: {
      id: true
    },
    where: and(eq(orgMembers.orgId, orgId), eq(teams.publicId, teamPublicId))
  });

  if (!teamQuery) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Team not found'
    });
  }

  const newTeamMemberPublicId = typeIdGenerator('teamMembers');
  const insertTeamMemberResponse = await db.insert(teamMembers).values({
    orgId: orgId,
    publicId: newTeamMemberPublicId,
    orgMemberId: orgMember.id,
    teamId: teamQuery.id,
    orgMemberProfileId: orgMember.orgMemberProfileId,
    role: 'member',
    notifications: 'active',
    addedBy: orgMemberId
  });

  if (!insertTeamMemberResponse) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Could not add user to team'
    });
  }

  const teamParticipationConvoIdsQuery =
    await db.query.convoParticipants.findMany({
      columns: {
        convoId: true
      },
      where: and(
        eq(convoParticipants.orgId, orgId),
        eq(convoParticipants.teamId, teamQuery.id)
      )
    });

  const teamParticipationConvoIds = teamParticipationConvoIdsQuery.map(
    (convo) => convo.convoId
  );

  if (teamParticipationConvoIds.length > 0) {
    for (const convoId of teamParticipationConvoIds) {
      const convoParticipantPublicId = typeIdGenerator('convoParticipants');
      let convoParticipantId: number | undefined;
      try {
        const insertConvoParticipantResponse = await db
          .insert(convoParticipants)
          .values({
            orgId: orgId,
            publicId: convoParticipantPublicId,
            convoId: convoId,
            orgMemberId: orgMember.id,
            role: 'teamMember',
            notifications: 'active'
          });
        if (insertConvoParticipantResponse) {
          convoParticipantId = Number(insertConvoParticipantResponse.insertId);
        }
      } catch (retry) {
        const existingConvoParticipant =
          await db.query.convoParticipants.findFirst({
            columns: {
              id: true
            },
            where: and(
              eq(convoParticipants.orgId, orgId),
              eq(convoParticipants.convoId, convoId),
              eq(convoParticipants.orgMemberId, orgMember.id)
            )
          });
        if (existingConvoParticipant) {
          convoParticipantId = Number(existingConvoParticipant.id);
        }
      }
      if (convoParticipantId) {
        await db.insert(convoParticipantTeamMembers).values({
          convoParticipantId: Number(convoParticipantId),
          teamId: teamQuery.id,
          orgId: orgId
        });
      }
    }
  }
  return newTeamMemberPublicId;
}
