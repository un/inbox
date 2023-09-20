import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../../trpc';
import { eq, and } from '@uninbox/database/orm';
import { orgs } from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';

export const orgProfileRouter = router({
  getOrgProfile: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId } = input;

      const orgProfileQuery = await db.read.query.orgs.findFirst({
        columns: {
          publicId: true,
          name: true,
          avatarId: true
        },
        where: and(eq(orgs.publicId, orgPublicId))
      });
      console.log({ orgProfileQuery });
      return {
        orgProfile: orgProfileQuery
      };
    }),

  setOrgProfile: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        orgName: z.string().min(3).max(32),
        orgAvatarId: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId, orgName, orgAvatarId } = input;

      await db.write
        .update(orgs)
        .set({
          name: orgName,
          ...(orgAvatarId && { avatarId: orgAvatarId })
        })
        .where(eq(orgs.publicId, orgPublicId));

      return {
        success: true
      };
    })
});
