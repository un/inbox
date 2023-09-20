import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../../trpc';
import { eq, and } from '@uninbox/database/orm';
import {
  orgs,
  orgMembers,
  userProfiles,
  users
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
import { mailBridgeTrpcClient } from '~/server/utils/mailBridgeTrpc';

export const orgMembersRouter = router({
  getOrgMembers: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;

      const { orgPublicId } = input;

      const orgQuery = await db.read.query.orgs.findFirst({
        columns: {
          publicId: true
        },
        where: and(eq(orgs.publicId, orgPublicId)),
        with: {
          members: {
            columns: {
              userId: true,
              role: true,
              status: true,
              addedAt: true,
              removedAt: true,
              invitedByUserId: true
            },
            with: {
              profile: {
                columns: {
                  publicId: true,
                  avatarId: true,
                  firstName: true,
                  lastName: true,
                  nickname: true,
                  title: true,
                  blurb: true
                }
              }
            }
          }
        }
      });

      // check if the users id is in the members profile array
      const orgMembersUserIds: number[] = [];
      orgQuery?.members.forEach((member) => {
        member.userId && orgMembersUserIds.push(member.userId);
      });

      if (!orgMembersUserIds.includes(+queryUserId)) {
        console.log('User not in convo');
        console.log({ queryUserId, orgMembersUserIds });
        return {
          members: null
        };
      }

      // strip the user IDs from the response
      orgQuery?.members.forEach((member) => {
        member.userId = 0;
      });

      console.log({ orgQuery });
      return {
        members: orgQuery?.members
      };
    })
});
