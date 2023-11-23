import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, orgProcedure } from '../../../trpc';
import { eq, and } from '@uninbox/database/orm';
import {
  orgs,
  orgMembers,
  userProfiles,
  users
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
import { mailBridgeTrpcClient } from '~/server/utils/tRPCServerClients';

export const orgMembersRouter = router({
  getOrgMembers: orgProcedure
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
                  handle: true,
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
    }),
  getOrgMembersList: orgProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        includeRemoved: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;

      const { orgPublicId, includeRemoved } = input;

      const userInOrg = await isUserInOrg({
        userId: queryUserId,
        orgPublicId
      });

      if (!userInOrg) {
        throw new Error('User not in org');
      }

      const orgQuery = await db.read.query.orgs.findFirst({
        columns: {
          publicId: true
        },
        where: and(eq(orgs.publicId, orgPublicId)),
        with: {
          members: {
            columns: {
              publicId: true,
              role: true,
              status: true,
              userId: true
            },
            where: !includeRemoved
              ? eq(orgMembers.status, 'active')
              : undefined,
            with: {
              profile: {
                columns: {
                  publicId: true,
                  avatarId: true,
                  firstName: true,
                  lastName: true,
                  title: true,
                  handle: true
                }
              }
            }
          }
        }
      });

      const ownMembershipId = orgQuery?.members.find(
        (member) => member.userId === +queryUserId
      )?.publicId;

      orgQuery?.members.forEach((member) => {
        member.userId = 0;
      });

      return {
        members: orgQuery?.members,
        ownMembershipId
      };
    })
});
