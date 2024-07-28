import { router, orgProcedure } from '~platform/trpc/trpc';
import { orgs, orgMembers } from '@u22n/database/schema';
import { eq, and, or } from '@u22n/database/orm';
import { z } from 'zod';

export const orgMembersRouter = router({
  isOrgMemberAdmin: orgProcedure.query(async ({ ctx }) => {
    const { org } = ctx;

    const accountOrgMembership = org.members.find(
      (member) => member.accountId === ctx.account.id
    );

    return accountOrgMembership?.role === 'admin';
  }),
  getOrgMembers: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;
    const orgId = org.id;

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
      const { db, account, org } = ctx;
      const accountId = account?.id;
      const orgId = org.id;

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
