import { z } from 'zod';
import { router, orgProcedure } from '../../../trpc';
import { eq, and, or } from '@u22n/database/orm';
import { orgs, orgMembers } from '@u22n/database/schema';
import { TRPCError } from '@trpc/server';

export const orgMembersRouter = router({
  isOrgMemberAdmin: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { org } = ctx;

      const accountOrgMembership = org.members.find(
        (member) => member.accountId === ctx.account.id
      );

      if (!accountOrgMembership) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account is not a member of this organization'
        });
      }

      return accountOrgMembership?.role === 'admin';
    }),
  getOrgMembers: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
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
                  avatarTimestamp: true,
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
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, account, org } = ctx;
      const accountId = account?.id;
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
              accountId: true
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
                  avatarTimestamp: true,
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
        (member) => member.accountId === accountId
      )?.publicId;

      orgQuery?.members.forEach((member) => {
        member.accountId = 0;
      });

      return {
        members: orgQuery?.members,
        ownMembershipId
      };
    })
});
