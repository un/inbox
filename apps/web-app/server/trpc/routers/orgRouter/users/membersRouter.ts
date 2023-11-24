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
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;

      const orgQuery = await db.read.query.orgs.findFirst({
        columns: {
          publicId: true
        },
        where: and(eq(orgs.id, orgId)),
        with: {
          members: {
            columns: {
              publicId: true,
              role: true,
              status: true,
              addedAt: true,
              removedAt: true,
              invitedByOrgMemberId: true
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

      return {
        members: orgQuery?.members
      };
    }),
  getOrgMembersList: orgProcedure
    .input(
      z.object({
        includeRemoved: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;

      const { includeRemoved } = input;

      const orgQuery = await db.read.query.orgs.findFirst({
        columns: {
          publicId: true
        },
        where: eq(orgs.id, +orgId),
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
        (member) => member.userId === +userId
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
