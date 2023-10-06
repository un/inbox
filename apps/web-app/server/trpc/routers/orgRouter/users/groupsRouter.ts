import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../../../trpc';
import { eq, and } from '@uninbox/database/orm';
import {
  userGroupMembers,
  userGroups,
  userProfiles
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
import { uiColors, UiColor } from '@uninbox/types/ui';

export const orgUserGroupsRouter = router({
  createOrgUserGroups: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        groupName: z.string().min(2).max(50),
        groupDescription: z.string().min(2).max(500).optional(),
        groupColor: z.enum(uiColors)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId, groupName, groupDescription, groupColor } = input;
      const newPublicId = nanoId();

      console.log({ input });

      const userInOrg = await isUserInOrg({
        userId: queryUserId,
        orgPublicId
      });

      if (!userInOrg) {
        throw new Error('User not in org');
      }

      await db.write.insert(userGroups).values({
        publicId: newPublicId,
        name: groupName,
        description: groupDescription,
        color: groupColor,
        orgId: userInOrg.orgId,
        avatarId: ''
      });

      return {
        newGroupPublicId: newPublicId
      };
    }),
  getOrgUserGroups: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId } = input;

      const userInOrg = await isUserInOrg({
        userId: queryUserId,
        orgPublicId
      });

      if (!userInOrg) {
        throw new Error('User not in org');
      }

      const userGroupQuery = await db.read.query.userGroups.findMany({
        columns: {
          publicId: true,
          name: true,
          description: true,
          color: true,
          avatarId: true
        },
        where: and(eq(userGroups.orgId, userInOrg.orgId)),
        with: {
          members: {
            columns: {},
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
  getUserGroup: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        userGroupPublicId: z.string().min(3).max(nanoIdLength),
        newUserGroup: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId } = input;
      const dbReplica = input.newUserGroup ? db.write : db.read;

      const userInOrg = await isUserInOrg({
        userId: queryUserId,
        orgPublicId
      });

      if (!userInOrg) {
        throw new Error('User not in org');
      }

      const userGroupQuery = await dbReplica.query.userGroups.findFirst({
        columns: {
          publicId: true,
          name: true,
          description: true,
          color: true,
          avatarId: true
        },
        where: and(
          eq(userGroups.publicId, input.userGroupPublicId),
          eq(userGroups.orgId, userInOrg.orgId)
        ),
        with: {
          members: {
            columns: {
              role: true,
              notifications: true,
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
        group: userGroupQuery
      };
    }),
  addUserToGroup: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        groupPublicId: z.string().min(3).max(nanoIdLength),
        userProfilePublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId, groupPublicId, userProfilePublicId } = input;
      const newPublicId = nanoId();

      console.log({ input });

      const userInOrg = await isUserInOrg({
        userId: queryUserId,
        orgPublicId
      });

      if (!userInOrg) {
        throw new Error('User not in org');
      }

      if (userInOrg.role !== 'admin') {
        throw new Error('User not admin');
      }

      const userProfile = await db.read.query.userProfiles.findFirst({
        columns: {
          userId: true,
          id: true
        },
        where: eq(userProfiles.publicId, userProfilePublicId)
      });

      if (!userProfile) {
        throw new Error('User not found');
      }

      const userGroup = await db.read.query.userGroups.findFirst({
        columns: {
          id: true
        },
        where: eq(userGroups.publicId, groupPublicId)
      });

      if (!userGroup) {
        throw new Error('Group not found');
      }

      const insertUserGroupMemberResult = await db.write
        .insert(userGroupMembers)
        .values({
          publicId: newPublicId,
          userId: userProfile.userId,
          groupId: userGroup.id,
          userProfileId: userProfile.id,
          role: 'member',
          notifications: 'active',
          addedBy: queryUserId
        });

      if (!insertUserGroupMemberResult) {
        throw new Error('Could not add user to group');
      }

      return {
        publicId: newPublicId
      };
    })
});
