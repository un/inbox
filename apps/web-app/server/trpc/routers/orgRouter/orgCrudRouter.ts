import { z } from 'zod';
import { parse, stringify } from 'superjson';
import {
  router,
  orgProcedure,
  limitedProcedure,
  userProcedure
} from '../../trpc';
import type { DBType } from '@uninbox/database';
import { eq, and } from '@uninbox/database/orm';
import {
  orgs,
  orgMembers,
  userProfiles,
  users
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
import { mailBridgeTrpcClient } from '~/server/utils/tRPCServerClients';

async function validateOrgSlug(
  db: DBType,
  slug: string
): Promise<{
  available: boolean;
  error: string | null;
}> {
  const orgId = await db.read
    .select({ id: orgs.id })
    .from(orgs)
    .where(eq(orgs.slug, slug));
  if (orgId.length !== 0) {
    return {
      available: false,
      error: 'Already taken'
    };
  }
  if (blockedUsernames.includes(slug.toLowerCase())) {
    return {
      available: false,
      error: 'Org slug not allowed'
    };
  }
  return {
    available: true,
    error: null
  };
}

export const crudRouter = router({
  checkSlugAvailability: userProcedure
    .input(
      z.object({
        slug: z
          .string()
          .min(5)
          .max(64)
          .regex(/^[a-zA-Z0-9]*$/, {
            message: 'Only letters and numbers'
          })
      })
    )
    .query(async ({ ctx, input }) => {
      return await validateOrgSlug(ctx.db, input.slug);
    }),

  createNewOrg: userProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32),
        orgSlug: z
          .string()
          .min(5)
          .max(64)
          .regex(/^[a-zA-Z0-9]*$/, {
            message: 'Only letters and numbers'
          })
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user?.id || 0;

      const newPublicId = nanoId();

      const insertOrgResponse = await db.write.insert(orgs).values({
        ownerId: +userId,
        name: input.orgName,
        slug: input.orgSlug,
        publicId: newPublicId
      });
      const orgId = +insertOrgResponse.insertId;

      //TODO: fix to where the userProfile ID is looked up on DB via SQL insert
      const userProfile = await db.read
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, +userId));

      const newPublicId2 = nanoId();
      await db.write.insert(orgMembers).values({
        orgId: orgId,
        publicId: newPublicId2,
        role: 'admin',
        userId: +userId,
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

  createPersonalOrg: userProcedure
    .input(z.object({}))
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user?.id || 0;

      const primaryRootDomain =
        //@ts-expect-error cant correctly infer the type of useRuntimeConfig mail
        useRuntimeConfig().public.mailDomainPublic[0].name as string;

      const existingPersonalOrg = await db.read
        .select({ id: orgs.id })
        .from(orgs)
        .where(and(eq(orgs.ownerId, +userId), eq(orgs.personalOrg, true)));
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
        .where(eq(users.id, +userId));
      const newPublicId = nanoId();

      const insertOrgResponse = await db.write.insert(orgs).values({
        ownerId: +userId,
        name: `${userObject[0].username}'s Personal Org`,
        slug: userObject[0].username,
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
        .where(eq(userProfiles.userId, userId));

      const newPublicId2 = nanoId();
      await db.write.insert(orgMembers).values({
        orgId: newOrgId,
        role: 'admin',
        userId: userId,
        publicId: newPublicId2,
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
          userId: +userId,
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

  getUserOrgs: userProcedure
    .input(
      z.object({
        onlyAdmin: z.boolean().optional(),
        includePersonal: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user?.id || 0;

      const userIsAdmin = input.onlyAdmin || false;

      const orgMembersQuery = await db.read.query.orgMembers.findMany({
        columns: {},
        where: userIsAdmin
          ? and(eq(orgMembers.userId, userId), eq(orgMembers.role, 'admin'))
          : eq(orgMembers.userId, userId),
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

      // filter out orgs that have personalOrg = true
      const usersOrgs = orgMembersQuery.filter(
        (orgMember) => orgMember.org.personalOrg !== true
      );

      const personalOrg = orgMembersQuery.filter(
        (orgMember) => orgMember.org.personalOrg === true
      );

      return {
        personalOrgs: input.includePersonal ? personalOrg : null,
        userOrgs: usersOrgs
      };
    })
});
