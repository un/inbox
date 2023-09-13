import { z } from 'zod';
import { router, protectedProcedure, limitedProcedure } from '../../trpc';
import { and, eq, or } from '@uninbox/database/orm';
import {
  convos,
  convoMembers,
  convoSubjects,
  userProfiles,
  externalEmailIdentities,
  userGroups,
  userGroupMembers
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';

export const convoRouter = router({
  getUserConvos: protectedProcedure
    .input(
      z.object({
        filterOrgPublicId: z.string().min(3).max(nanoIdLength).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { filterOrgPublicId } = input;
      const userId = user.userId || 0;

      const userGroupMembershipsSubQuery = db
        .select({ groupId: userGroupMembers.groupId })
        .from(userGroupMembers)
        .where(eq(userGroupMembers.userId, userId))
        .as('sq');
      const usersConversationsSubQuery = db
        .select({ convoId: convoMembers.conversationId })
        .from(convoMembers)
        .where(
          or(
            eq(convoMembers.userId, userId),
            eq(convoMembers.userGroupId, userGroupMembershipsSubQuery)
          )
        )
        .as('sq');

      const userConversationResults = await db
        .select({ subjects: convoSubjects.subject, convoMembers: {} })
        .from(convos)
        .where(eq(convos.id, usersConversationsSubQuery));

      const relationalResults = await db.query.convos.findMany({
        where: {},
        columns: {},
        with: {}
      });

      return {
        success: true,
        orgId: orgPublicId,
        inviteId: newPublicId,
        error: null
      };
    })
});
