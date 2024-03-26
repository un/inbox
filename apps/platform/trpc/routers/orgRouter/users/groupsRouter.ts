import { z } from 'zod';
import { router, orgProcedure } from '../../../trpc';
import { eq, and } from '@u22n/database/orm';
import { groups } from '@u22n/database/schema';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils';
import { uiColors } from '@u22n/types/ui';
import { isAccountAdminOfOrg } from '../../../../utils/account';
import { TRPCError } from '@trpc/server';
import { addOrgMemberToGroupHandler } from './groupHandler';

export const groupsRouter = router({
  createGroup: orgProcedure
    .input(
      z.object({
        groupName: z.string().min(2).max(50),
        groupDescription: z.string().min(0).max(500).optional(),
        groupColor: z.enum(uiColors)
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;

      const orgId = org?.id;
      const { groupName, groupDescription, groupColor } = input;
      const newPublicId = typeIdGenerator('groups');

      const isAdmin = await isAccountAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      await db.insert(groups).values({
        publicId: newPublicId,
        name: groupName,
        description: groupDescription,
        color: groupColor,
        orgId: orgId
      });

      return {
        newGroupPublicId: newPublicId
      };
    }),
  getOrgGroups: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;

      const groupQuery = await db.query.groups.findMany({
        columns: {
          publicId: true,
          avatarId: true,
          name: true,
          description: true,
          color: true
        },
        where: and(eq(groups.orgId, orgId)),
        with: {
          members: {
            columns: {
              publicId: true,
              id: true
            },
            with: {
              orgMember: {
                columns: {
                  publicId: true
                }
              },
              orgMemberProfile: {
                columns: {
                  publicId: true,
                  avatarId: true,
                  firstName: true,
                  lastName: true,
                  handle: true,
                  title: true
                }
              }
            }
          }
        }
      });

      return {
        groups: groupQuery
      };
    }),
  getGroup: orgProcedure
    .input(
      z.object({
        groupPublicId: typeIdValidator('groups'),
        newGroup: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;

      // Handle when adding database replicas
      const dbReplica = db;

      const groupQuery = await dbReplica.query.groups.findFirst({
        columns: {
          publicId: true,
          avatarId: true,
          name: true,
          description: true,
          color: true
        },
        where: and(
          eq(groups.publicId, input.groupPublicId),
          eq(groups.orgId, orgId)
        ),
        with: {
          members: {
            columns: {
              role: true,
              notifications: true,
              publicId: true
            },
            with: {
              orgMember: {
                columns: {
                  publicId: true
                }
              },
              orgMemberProfile: {
                columns: {
                  publicId: true,
                  avatarId: true,
                  firstName: true,
                  lastName: true,
                  handle: true,
                  title: true
                }
              }
            }
          }
        }
      });

      return {
        group: groupQuery
      };
    }),
  addOrgMemberToGroup: orgProcedure
    .input(
      z.object({
        groupPublicId: typeIdValidator('groups'),
        orgMemberPublicId: typeIdValidator('orgMembers')
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { org } = ctx;
      const { groupPublicId, orgMemberPublicId } = input;

      const isAdmin = await isAccountAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const newGroupMemberPublicId = await addOrgMemberToGroupHandler({
        orgId: org.id,
        groupPublicId: groupPublicId,
        orgMemberPublicId: orgMemberPublicId,
        orgMemberId: org.memberId
      });

      return {
        publicId: newGroupMemberPublicId
      };
    })
});
