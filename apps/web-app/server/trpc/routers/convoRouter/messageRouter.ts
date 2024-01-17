import { z } from 'zod';
import { router, orgProcedure, limitedProcedure } from '../../trpc';
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
import { nanoId, nanoIdLength, nanoIdToken, nanoIdSchema } from '@uninbox/utils';

export const messageRouter = router({
  getConvoMessages: orgProcedure
    .input(
      z.object({
        convoPublicId: nanoIdSchema,
        cursorLastCreatedAt: z.date().optional(),
        cursorLastPublicId: nanoIdSchema.optional()
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = +user?.id;
      const orgId = +org?.id;
      const { convoPublicId, cursorLastCreatedAt, cursorLastPublicId } = input;

      const inputLastCreatedAt = cursorLastCreatedAt
        ? new Date(cursorLastCreatedAt)
        : new Date();
      const inputLastPublicId = cursorLastPublicId || '';

      // TODO: Find a better way to do this
      // Verify the user is in the convo
      const convoDetails = await db.query.convos.findFirst({
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
                  publicId: true,
                  handle: true
                }
              },
              userGroup: {
                columns: {
                  name: true,
                  color: true,
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

      const convoMessagesReturn = await db.query.convoMessages.findMany({
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
