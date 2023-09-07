import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../../trpc';
import { eq } from '@uninbox/database/orm';
import { orgs, orgMembers, userProfiles } from '@uninbox/database/schema';
import { nanoid } from '@uninbox/utils';
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

      const newPublicId = nanoid();

      const insertOrgResponse = await db.insert(orgs).values({
        ownerId: queryUserId,
        name: input.orgName,
        publicId: newPublicId
      });
      const orgId = +insertOrgResponse.insertId;

      //TODO: fix to where the userProfile ID is looked up on DB via SQL insert
      const userProfile = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, queryUserId));

      await db.insert(orgMembers).values({
        orgId: orgId,
        role: 'admin',
        userId: queryUserId,
        status: 'active',
        userProfileId: userProfile[0].id
      });

      mailBridgeTrpcClient.postal.createOrg.mutate({
        orgId: orgId,
        orgPublicId: newPublicId
      });

      return {
        success: true,
        orgId: newPublicId,
        orgName: input.orgName,
        error: null
      };
    })
});
