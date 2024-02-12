import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, orgProcedure } from '../../../trpc';
import { eq, and, or } from '@uninbox/database/orm';
import {
  orgs,
  orgMembers,
  userProfiles,
  users
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
import { mailBridgeTrpcClient } from '~/server/utils/tRPCServerClients';
import { TRPCError } from '@trpc/server';

export const orgMembersRouter = router({
  getOrgMembers: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;

      const orgQuery = await db.query.orgs.findFirst({
        columns: {
          id: true
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
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;

      const { includeRemoved } = input;

      const orgQuery = await db.query.orgs.findFirst({
        columns: {
          id: true
        },
        where: eq(orgs.id, orgId),
        with: {
          members: {
            columns: {
              publicId: true,
              role: true,
              status: true,
              userId: true
            },
            where: !includeRemoved
              ? or(
                  eq(orgMembers.status, 'active'),
                  eq(orgMembers.status, 'invited')
                )
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
        (member) => member.userId === userId
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
