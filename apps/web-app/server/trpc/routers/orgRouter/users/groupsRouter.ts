import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, orgProcedure } from '../../../trpc';
import { eq, and } from '@uninbox/database/orm';
import {
  orgMembers,
  userGroupMembers,
  userGroups,
  userProfiles
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdSchema } from '@uninbox/utils';
import { uiColors } from '@uninbox/types/ui';
import type { UiColor } from '@uninbox/types/ui';
import { isUserAdminOfOrg } from '~/server/utils/user';
import { TRPCError } from '@trpc/server';

export const orgUserGroupsRouter = router({
  createOrgUserGroups: orgProcedure
    .input(
      z.object({
        groupName: z.string().min(2).max(50),
        groupDescription: z.string().min(0).max(500).optional(),
        groupColor: z.enum(uiColors)
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;
      const { groupName, groupDescription, groupColor } = input;
      const newPublicId = nanoId();

      const isAdmin = await isUserAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      await db.insert(userGroups).values({
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
  getOrgUserGroups: orgProcedure
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

      const userGroupQuery = await db.query.userGroups.findMany({
        columns: {
          publicId: true,
          avatarId: true,
          name: true,
          description: true,
          color: true
        },
        where: and(eq(userGroups.orgId, orgId)),
        with: {
          members: {
            columns: {
              publicId: true
            },
            with: {
              userProfile: {
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
        groups: userGroupQuery
      };
    }),
  getUserGroup: orgProcedure
    .input(
      z.object({
        userGroupPublicId: nanoIdSchema,
        newUserGroup: z.boolean().optional()
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

      // Handle when adding database replicas
      const dbReplica = db;

      const userGroupQuery = await dbReplica.query.userGroups.findFirst({
        columns: {
          publicId: true,
          avatarId: true,
          name: true,
          description: true,
          color: true
        },
        where: and(
          eq(userGroups.publicId, input.userGroupPublicId),
          eq(userGroups.orgId, orgId)
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
              userProfile: {
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
        group: userGroupQuery
      };
    }),
  addUserToGroup: orgProcedure
    .input(
      z.object({
        groupPublicId: nanoIdSchema,
        orgMemberPublicId: nanoIdSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;
      const { groupPublicId, orgMemberPublicId } = input;
      const newPublicId = nanoId();

      const isAdmin = await isUserAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const orgMember = await db.query.orgMembers.findFirst({
        columns: {
          userId: true,
          id: true,
          userProfileId: true
        },
        where: eq(orgMembers.publicId, orgMemberPublicId)
      });

      if (!orgMember) {
        throw new Error('User not found');
      }

      const userGroup = await db.query.userGroups.findFirst({
        columns: {
          id: true
        },
        where: eq(userGroups.publicId, groupPublicId)
      });

      if (!userGroup) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found'
        });
      }

      const insertUserGroupMemberResult = await db
        .insert(userGroupMembers)
        .values({
          publicId: newPublicId,
          orgMemberId: orgMember.id,
          groupId: userGroup.id,
          userProfileId: orgMember.userProfileId,
          role: 'member',
          notifications: 'active',
          addedBy: userId
        });

      if (!insertUserGroupMemberResult) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not add user to group'
        });
      }

      return {
        publicId: newPublicId
      };
    })
});
