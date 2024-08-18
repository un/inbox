import { convoEntries, convoParticipants, convos } from '@u22n/database/schema';
import RealtimeServer from '@u22n/realtime/server';
import { eq, inArray } from '@u22n/database/orm';
import type { TypeId } from '@u22n/utils/typeid';
import { db } from '@u22n/database';
import { env } from '~platform/env';

export const realtime = new RealtimeServer({
  appId: env.REALTIME_APP_ID,
  appKey: env.REALTIME_APP_KEY,
  appSecret: env.REALTIME_APP_SECRET,
  host: env.REALTIME_HOST,
  port: env.REALTIME_PORT
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
      },
      spaces: {
        columns: {},
        with: {
          space: {
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
  const spacesForNotification = convoQuery.spaces.map(
    (space) => space.space.publicId
  );
  // const orgMembersForNotificationPublicIds: TypeId<'orgMembers'>[] = [];
  // const orgMembersToUnhide: {
  //   participantId: number;
  //   orgMemberPublicId: TypeId<'orgMembers'>;
  // }[] = [];

  let convoEntryPublicId: TypeId<'convoEntries'> | null = null;

  // convoQuery.participants.forEach((participant) => {
  //   if (participant.orgMember) {
  //     orgMembersForNotificationPublicIds.push(participant.orgMember.publicId);

  //     if (participant.hidden) {
  //       orgMembersToUnhide.push({
  //         participantId: participant.id,
  //         orgMemberPublicId: participant.orgMember.publicId
  //       });
  //     }
  //   }
  // });

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
    await Promise.allSettled(
      spacesForNotification.map(
        async (spacePublicId) =>
          await realtime.emitOnChannels({
            channel: `private-space-${spacePublicId}`,
            event: 'convo:new',
            data: {
              publicId: convoPublicId
            }
          })
      )
    );
  } else {
    await Promise.allSettled(
      spacesForNotification.map(
        async (spacePublicId) =>
          await realtime.emitOnChannels({
            channel: `private-space-${spacePublicId}`,
            event: 'convo:entry:new',
            data: {
              convoPublicId,
              convoEntryPublicId
            }
          })
      )
    );

    // if (orgMembersToUnhide.length > 0) {
    //   const participantIds = orgMembersToUnhide.map(
    //     (orgMember) => orgMember.participantId
    //   );
    //   await db
    //     .update(convoParticipants)
    //     .set({
    //       hidden: false
    //     })
    //     .where(inArray(convoParticipants.id, participantIds));

    // const orgMemberPublicIds = orgMembersToUnhide.map(
    //   (orgMember) => orgMember.orgMemberPublicId
    // );
    // await realtime
    //   .emit({
    //     event: 'convo:hidden',
    //     orgMemberPublicIds: orgMemberPublicIds,
    //     data: {
    //       publicId: convoPublicId,
    //       hidden: false,
    //       spaceShortcode: spaceShortCodes
    //     }
    //   })
    //   .catch(console.error);
    // }
  }
}
