import { z } from 'zod';
import { router, protectedProcedure, limitedProcedure } from '../../trpc';
import { and, desc, eq, inArray, lt, or } from '@uninbox/database/orm';
import {
  convos,
  convoMembers,
  convoSubjects,
  userProfiles,
  foreignEmailIdentities,
  userGroups,
  userGroupMembers,
  convoMessages
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';

export const messageRouter = router({
  getConvoMessages: protectedProcedure
    .input(
      z.object({
        convoPublicId: z.string().min(3).max(nanoIdLength),
        cursorLastCreatedAt: z.date().optional(),
        cursorLastPublicId: z.string().min(3).max(nanoIdLength).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { convoPublicId, cursorLastCreatedAt, cursorLastPublicId } = input;
      const userId = user.userId || 0;

      const inputLastCreatedAt = cursorLastCreatedAt
        ? new Date(cursorLastCreatedAt)
        : new Date();
      const inputLastPublicId = cursorLastPublicId || '';

      // TODO: Find a better way to do this
      // Verify the user is in the convo
      const convoDetails = await db.read.query.convos.findFirst({
        where: eq(convos.publicId, convoPublicId),
        columns: {
          id: true
        },
        with: {
          members: {
            with: {
              userProfile: {
                columns: {
                  userId: true,
                  firstName: true,
                  lastName: true,
                  avatarId: true,
                  publicId: true,
                  handle: true
                }
              },
              userGroup: {
                columns: {
                  name: true,
                  color: true,
                  avatarId: true,
                  publicId: true
                },
                with: {
                  members: {
                    columns: {
                      userId: true
                    }
                  }
                }
              },
              foreignEmailIdentity: {
                columns: {
                  senderName: true,
                  avatarId: true,
                  username: true,
                  rootDomain: true,
                  publicId: true
                }
              }
            },
            columns: {
              userId: true,
              userGroupId: true,
              foreignEmailIdentityId: true,
              role: true
            }
          }
        }
      });

      if (!convoDetails) {
        console.log('Convo not found');
        return {
          error: 'Convo not found'
        };
      }
      //Check if the user is in the conversation
      const convoMembersUserIds: number[] = [];
      convoDetails?.members.forEach((member) => {
        member.userId && convoMembersUserIds.push(member.userId);
        member.userProfile?.userId &&
          convoMembersUserIds.push(member.userProfile.userId);
        member.userGroup?.members.forEach((groupMember) => {
          groupMember.userId && convoMembersUserIds.push(groupMember.userId);
        });
      });

      if (!convoMembersUserIds.includes(+userId)) {
        console.log('User not in convo');
        console.log({ userId, convoMembersUserIds });
        return {
          error: 'User not in convo'
        };
      }

      const convoMessagesReturn = await db.read.query.convoMessages.findMany({
        orderBy: [desc(convoMessages.createdAt), desc(convoMessages.publicId)],
        limit: 15,
        columns: {
          publicId: true,
          createdAt: true,
          author: true,
          body: true
        },
        where: and(
          or(
            and(
              eq(convoMessages.createdAt, inputLastCreatedAt),
              lt(convoMessages.publicId, inputLastPublicId)
            ),
            lt(convoMessages.createdAt, inputLastCreatedAt)
          ),
          eq(convoMessages.convoId, convoDetails.id)
        )
      });

      return {
        messages: convoMessagesReturn
      };
    })
});
