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

export const settingsRouter = router({
  createNewOrg: protectedProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const newPublicId = nanoId();

      const insertOrgResponse = await db.write.insert(orgs).values({
        ownerId: queryUserId,
        name: input.orgName,
        publicId: newPublicId
      });
      const orgId = +insertOrgResponse.insertId;

      //TODO: fix to where the userProfile ID is looked up on DB via SQL insert
      const userProfile = await db.read
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, queryUserId));

      await db.write.insert(orgMembers).values({
        orgId: orgId,
        role: 'admin',
        userId: queryUserId,
        status: 'active',
        userProfileId: userProfile[0].id
      });

      mailBridgeTrpcClient.postal.org.createOrg.mutate({
        orgId: orgId,
        orgPublicId: newPublicId
      });

      return {
        success: true,
        orgId: newPublicId,
        orgName: input.orgName,
        error: null
      };
    }),

  createPersonalOrg: protectedProcedure
    .input(z.object({}))
    .mutation(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const primaryRootDomain =
        //@ts-expect-error cant correctly infer the type of useRuntimeConfig mail
        useRuntimeConfig().public.mailDomainPublic[0].name as string;

      const existingPersonalOrg = await db.read
        .select({ id: orgs.id })
        .from(orgs)
        .where(and(eq(orgs.ownerId, queryUserId), eq(orgs.personalOrg, true)));
      if (existingPersonalOrg.length > 0) {
        return {
          success: false,
          orgId: null,
          orgName: null,
          error: 'You already have a personal org'
        };
      }

      const userObject = await db.read
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(eq(users.id, queryUserId));
      const newPublicId = nanoId();

      const insertOrgResponse = await db.write.insert(orgs).values({
        ownerId: queryUserId,
        name: `${userObject[0].username}'s Personal Org`,
        publicId: newPublicId,
        personalOrg: true
      });
      const newOrgId = +insertOrgResponse.insertId;

      const userProfile = await db.read
        .select({
          id: userProfiles.id,
          fname: userProfiles.firstName,
          lname: userProfiles.lastName
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, queryUserId));

      await db.write.insert(orgMembers).values({
        orgId: newOrgId,
        role: 'admin',
        userId: queryUserId,
        status: 'active',
        userProfileId: userProfile[0].id
      });

      const insertMailBridgeOrgResponse =
        mailBridgeTrpcClient.postal.org.createOrg.mutate({
          orgId: +newOrgId,
          orgPublicId: newPublicId,
          personalOrg: true
        });

      // creates the new root email address
      await mailBridgeTrpcClient.postal.emailRoutes.createRootEmailAddress.mutate(
        {
          orgId: +newOrgId,
          rootDomainName: primaryRootDomain,
          sendName: `${userProfile[0].fname} ${userProfile[0].lname}`,
          serverPublicId: (await insertMailBridgeOrgResponse).serverPublicId,
          userId: +queryUserId,
          username: userObject[0].username.toLocaleLowerCase()
        }
      );

      return {
        success: true,
        email: `${userObject[0].username}@${primaryRootDomain}`,
        orgId: newPublicId,
        error: null
      };
    }),

  getUserOrgs: protectedProcedure
    .input(
      z.object({
        onlyAdmin: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const userIsAdmin = input.onlyAdmin || false;

      const orgMembersQuery = await db.read.query.orgMembers.findMany({
        columns: {},
        where: userIsAdmin
          ? and(
              eq(orgMembers.userId, queryUserId),
              eq(orgMembers.role, 'admin')
            )
          : eq(orgMembers.userId, queryUserId),
        with: {
          org: {
            columns: {
              publicId: true,
              name: true,
              avatarId: true,
              personalOrg: true
            }
          }
        }
      });

      return {
        userOrgs: orgMembersQuery
      };
    })
});
