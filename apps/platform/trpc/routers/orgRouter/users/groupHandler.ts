import { TRPCError } from '@trpc/server';
import { db } from '@u22n/database';
import { and, eq } from '@u22n/database/orm';
import {
  convoParticipantGroupMembers,
  convoParticipants,
  groupMembers,
  groups,
  orgMembers
} from '@u22n/database/schema';
import { typeIdGenerator, type TypeId } from '@u22n/utils';

export async function addOrgMemberToGroupHandler({
  orgId,
  orgMemberId,
  orgMemberPublicId,
  groupPublicId
}: {
  orgId: number;
  orgMemberId: number;
  orgMemberPublicId: TypeId<'orgMembers'>;
  groupPublicId: TypeId<'groups'>;
}) {
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

  const groupQuery = await db.query.groups.findFirst({
    columns: {
      id: true
    },
    where: and(eq(orgMembers.orgId, orgId), eq(groups.publicId, groupPublicId))
  });

  if (!groupQuery) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Group not found'
    });
  }

  const newGroupMemberPublicId = typeIdGenerator('groupMembers');
  const insertGroupMemberResponse = await db.insert(groupMembers).values({
    orgId: orgId,
    publicId: newGroupMemberPublicId,
    orgMemberId: orgMember.id,
    groupId: groupQuery.id,
    orgMemberProfileId: orgMember.orgMemberProfileId,
    role: 'member',
    notifications: 'active',
    addedBy: orgMemberId
  });

  if (!insertGroupMemberResponse) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Could not add user to group'
    });
  }

  const groupParticipationConvoIdsQuery =
    await db.query.convoParticipants.findMany({
      columns: {
        convoId: true
      },
      where: and(
        eq(convoParticipants.orgId, orgId),
        eq(convoParticipants.groupId, groupQuery.id)
      )
    });

  const groupParticipationConvoIds = groupParticipationConvoIdsQuery.map(
    (convo) => convo.convoId
  );

  if (groupParticipationConvoIds.length > 0) {
    for (const convoId of groupParticipationConvoIds) {
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
            role: 'groupMember',
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
        await db.insert(convoParticipantGroupMembers).values({
          convoParticipantId: Number(convoParticipantId),
          groupId: groupQuery.id,
          orgId: orgId
        });
      }
    }
  }
  return newGroupMemberPublicId;
}
