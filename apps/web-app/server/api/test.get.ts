import { db } from '@uninbox/database';
import {
  InferSelectModel,
  and,
  desc,
  eq,
  gt,
  inArray,
  lt,
  or
} from '@uninbox/database/orm';
import {
  convoMembers,
  convoMessages,
  convoNotes,
  convoSubjects,
  convos,
  userGroupMembers
} from '@uninbox/database/schema';

export default defineEventHandler(async (event) => {
  const { user } = event.context;
  const userId = user.userId || 1;

  // const response = await db
  //   .select({ id: convos.id })
  //   .from(convos)
  //   .where(
  //     inArray(
  //       convos.id,
  //       db
  //         .select({ id: convoMembers.convoId })
  //         .from(convoMembers)
  //         .where(
  //           or(
  //             eq(convoMembers.userId, userId),
  //             inArray(
  //               convoMembers.userGroupId,
  //               db
  //                 .select({ id: userGroupMembers.groupId })
  //                 .from(userGroupMembers)
  //                 .where(eq(userGroupMembers.userId, userId))
  //             )
  //           )
  //         )
  //     )
  //   );

  const inputLastUpdatedAt = new Date('2023-08-23T17:09:07.000Z');
  const inputLastPublicId = 'qpksy9t88tkgvnmp';
  const builder = await db.query.convos.findMany({
    orderBy: [desc(convos.lastUpdatedAt), desc(convos.publicId)],
    limit: 15,
    columns: {
      publicId: true,
      lastUpdatedAt: true
    },
    where: and(
      or(
        and(
          eq(convos.lastUpdatedAt, inputLastUpdatedAt),
          lt(convos.publicId, inputLastPublicId)
        ),
        lt(convos.lastUpdatedAt, inputLastUpdatedAt)
      ),
      inArray(
        convos.id,
        db
          .select({ id: convoMembers.convoId })
          .from(convoMembers)
          .where(
            or(
              eq(convoMembers.userId, userId),
              inArray(
                convoMembers.userGroupId,
                db
                  .select({ id: userGroupMembers.groupId })
                  .from(userGroupMembers)
                  .where(eq(userGroupMembers.userId, userId))
              )
            )
          )
      )
    ),
    with: {
      org: {
        columns: {
          publicId: true,
          name: true,
          avatarId: true
        }
      },
      subjects: {
        columns: {
          subject: true
        }
      },
      members: {
        with: {
          userProfile: {
            columns: {
              firstName: true,
              lastName: true,
              avatarId: true
            }
          },
          userGroup: {
            columns: {
              name: true,
              color: true,
              avatarId: true
            }
          },
          foreignEmailIdentity: {
            columns: {
              senderName: true,
              avatarId: true,
              username: true,
              rootDomain: true
            }
          }
        },
        columns: {
          id: true,
          userId: true,
          userGroupId: true,
          foreignEmailIdentityId: true,
          role: true
        }
      },
      messages: {
        orderBy: [desc(convoMessages.createdAt)],
        limit: 1,
        columns: {
          body: true
        },
        with: {
          author: {
            with: {
              userProfile: {
                columns: {
                  firstName: true,
                  lastName: true,
                  avatarId: true
                }
              },
              userGroup: {
                columns: {
                  name: true,
                  color: true,
                  avatarId: true
                }
              },
              foreignEmailIdentity: {
                columns: {
                  senderName: true,
                  avatarId: true
                }
              }
            }
          }
        }
      }
    }
  });

  return builder;
});
