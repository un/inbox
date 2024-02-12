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
  users,
  postalServers,
  orgPostalConfigs
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
import { mailBridgeTrpcClient } from '~/server/utils/tRPCServerClients';
import { TRPCError } from '@trpc/server';

async function validateOrgSlug(
  db: DBType,
  slug: string
): Promise<{
  available: boolean;
  error: string | null;
}> {
  const orgId = await db
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
      const userId = user.id;

      const newPublicId = nanoId();

      const insertOrgResponse = await db.insert(orgs).values({
        ownerId: userId,
        name: input.orgName,
        slug: input.orgSlug,
        publicId: newPublicId
      });
      const orgId = +insertOrgResponse.insertId;

      const userProfile = await db.query.userProfiles.findFirst({
        where: and(
          eq(userProfiles.userId, userId),
          eq(userProfiles.defaultProfile, true)
        ),
        columns: {
          id: true,
          publicId: true,
          avatarId: true,
          userId: true,
          firstName: true,
          lastName: true,
          handle: true,
          title: true,
          blurb: true,
          defaultProfile: true,
          createdAt: true
        }
      });
      const newProfilePublicId = nanoId();
      let userProfileId: number;
      if (userProfile && userProfile.id) {
        const existingFields = {
          publicId: newProfilePublicId,
          avatarId: userProfile.avatarId,
          userId: userProfile.userId,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          handle: userProfile.handle,
          title: userProfile.title,
          blurb: userProfile.blurb,
          defaultProfile: false
        };
        const newProfile = await db.insert(userProfiles).values(existingFields);
        userProfileId = +newProfile.insertId;
      } else {
        const { username } =
          (await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
              username: true
            }
          })) || {};

        if (!username) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found. Please contact support.'
          });
        }

        const defaultProfileValues = {
          publicId: newProfilePublicId,
          userId: userId,
          firstName: username,
          lastName: '',
          handle: username,
          title: '',
          blurb: '',
          defaultProfile: true
        };

        const newProfile = await db
          .insert(userProfiles)
          .values(defaultProfileValues);
        userProfileId = +newProfile.insertId;
      }

      const newPublicId2 = nanoId();
      await db.insert(orgMembers).values({
        orgId: orgId,
        publicId: newPublicId2,
        role: 'admin',
        userId: userId,
        status: 'active',
        userProfileId: userProfileId
      });

      const createMailBridgeOrgResponse =
        await mailBridgeTrpcClient.postal.org.createOrg.mutate({
          orgId: orgId,
          orgPublicId: newPublicId
        });

      await db.insert(postalServers).values({
        orgId: orgId,
        publicId: createMailBridgeOrgResponse.postalServer.serverPublicId,
        type: 'email',
        apiKey: createMailBridgeOrgResponse.postalServer.apiKey,
        smtpKey: createMailBridgeOrgResponse.postalServer.smtpKey,
        sendLimit: createMailBridgeOrgResponse.postalServer.sendLimit,
        rootMailServer: createMailBridgeOrgResponse.postalServer.rootMailServer
      });

      const orgPostalConfigResponse = await db.query.orgPostalConfigs.findFirst(
        {
          where: eq(orgPostalConfigs.orgId, orgId)
        }
      );
      if (!orgPostalConfigResponse) {
        await db.insert(orgPostalConfigs).values({
          orgId: orgId,
          host: createMailBridgeOrgResponse.config.host,
          ipPools: createMailBridgeOrgResponse.config.ipPools,
          defaultIpPool: createMailBridgeOrgResponse.config.defaultIpPool
        });
      }

      return {
        orgId: newPublicId,
        orgName: input.orgName
      };
    }),

  getUserOrgs: userProcedure
    .input(
      z.object({
        onlyAdmin: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user.id;

      const whereUserIsAdmin = input.onlyAdmin || false;

      const orgMembersQuery = await db.query.orgMembers.findMany({
        columns: {
          role: true
        },
        where: whereUserIsAdmin
          ? and(eq(orgMembers.userId, userId), eq(orgMembers.role, 'admin'))
          : eq(orgMembers.userId, userId),
        with: {
          org: {
            columns: {
              publicId: true,
              avatarId: true,
              name: true,
              slug: true
            }
          }
        }
      });

      const adminOrgSlugs = orgMembersQuery
        .filter((orgMember) => orgMember.role === 'admin')
        .map((orgMember) => orgMember.org.slug);

      return {
        userOrgs: orgMembersQuery,
        adminOrgSlugs: adminOrgSlugs
      };
    })
});
