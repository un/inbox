import { useRuntimeConfig } from '#imports';
import { db } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { convoEntries, convos } from '@u22n/database/schema';
import RealtimeServer from '@u22n/realtime/server';
import type { TypeId } from '@u22n/utils';

export const realtime = new RealtimeServer(useRuntimeConfig().realtime);

export async function sendRealtimeNotification({
  newConvo,
  convoId,
  convoEntryId
}: {
  newConvo: boolean;
  convoId: number;
  convoEntryId: number;
}) {
  // get the convo and members from the db
  const convoQuery = await db.query.convos.findFirst({
    where: eq(convos.id, convoId),
    columns: {
      publicId: true
    },
    with: {
      participants: {
        columns: {
          orgMemberId: true
        },
        with: {
          orgMember: {
            columns: {
              publicId: true
            }
          }
        }
      }
    }
  });

  if (!convoQuery) {
    return;
  }

  const convoPublicId = convoQuery.publicId;
  const orgMembersForNotificationPublicIds: TypeId<'orgMembers'>[] = [];
  let convoEntryPublicId: TypeId<'convoEntries'> | null = null;

  convoQuery.participants.forEach((participant) => {
    if (participant.orgMember) {
      orgMembersForNotificationPublicIds.push(participant.orgMember.publicId);
    }
  });

  if (!newConvo) {
    const convoEntryQuery = await db.query.convoEntries.findFirst({
      where: eq(convoEntries.id, convoEntryId),
      columns: {
        publicId: true
      }
    });
    if (convoEntryQuery) {
      convoEntryPublicId = convoEntryQuery.publicId;
    }
  }

  if (newConvo || !convoEntryPublicId) {
    await realtime.emit({
      event: 'convo:new',
      orgMemberPublicIds: orgMembersForNotificationPublicIds,
      data: {
        publicId: convoPublicId
      }
    });
    return;
  } else {
    await realtime.emit({
      event: 'convo:entry:new',
      orgMemberPublicIds: orgMembersForNotificationPublicIds,
      data: {
        convoPublicId,
        convoEntryPublicId
      }
    });
  }
}
