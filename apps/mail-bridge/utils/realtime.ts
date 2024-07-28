import { convoEntries, convoParticipants, convos } from '@u22n/database/schema';
import RealtimeServer from '@u22n/realtime/server';
import { eq, inArray } from '@u22n/database/orm';
import type { TypeId } from '@u22n/utils/typeid';
import { db } from '@u22n/database';
import { env } from '../env';

export const realtime = new RealtimeServer({
  host: env.REALTIME_HOST,
  port: env.REALTIME_PORT,
  appSecret: env.REALTIME_APP_SECRET,
  appId: env.REALTIME_APP_ID,
  appKey: env.REALTIME_APP_KEY
});

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
          id: true,
          orgMemberId: true,
          hidden: true
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
  const orgMembersToUnhide: {
    participantId: number;
    orgMemberPublicId: TypeId<'orgMembers'>;
  }[] = [];

  let convoEntryPublicId: TypeId<'convoEntries'> | null = null;

  convoQuery.participants.forEach((participant) => {
    if (participant.orgMember) {
      orgMembersForNotificationPublicIds.push(participant.orgMember.publicId);

      if (participant.hidden) {
        orgMembersToUnhide.push({
          participantId: participant.id,
          orgMemberPublicId: participant.orgMember.publicId
        });
      }
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
    await realtime
      .emit({
        event: 'convo:new',
        orgMemberPublicIds: orgMembersForNotificationPublicIds,
        data: {
          publicId: convoPublicId
        }
      })
      .catch(console.error);
  } else {
    await realtime
      .emit({
        event: 'convo:entry:new',
        orgMemberPublicIds: orgMembersForNotificationPublicIds,
        data: {
          convoPublicId,
          convoEntryPublicId
        }
      })
      .catch(console.error);
    if (orgMembersToUnhide.length > 0) {
      const participantIds = orgMembersToUnhide.map(
        (orgMember) => orgMember.participantId
      );
      await db
        .update(convoParticipants)
        .set({
          hidden: false
        })
        .where(inArray(convoParticipants.id, participantIds));

      const orgMemberPublicIds = orgMembersToUnhide.map(
        (orgMember) => orgMember.orgMemberPublicId
      );
      await realtime
        .emit({
          event: 'convo:hidden',
          orgMemberPublicIds: orgMemberPublicIds,
          data: {
            publicId: convoPublicId,
            hidden: false
          }
        })
        .catch(console.error);
    }
  }
}
