import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, orgProcedure } from '../../../trpc';
import { eq, and } from '@uninbox/database/orm';
import { orgs } from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdSchema } from '@uninbox/utils';
import { isUserAdminOfOrg } from '~/server/utils/user';
import { TRPCError } from '@trpc/server';

export const orgProfileRouter = router({
  getOrgProfile: orgProcedure
    .input(
      z.object({
        orgPublicId: nanoIdSchema.optional()
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
      const { orgPublicId } = input;

      const orgProfileQuery = await db.query.orgs.findFirst({
        columns: {
          publicId: true,
          avatarId: true,
          name: true
        },
        where: orgPublicId ? eq(orgs.publicId, orgPublicId) : eq(orgs.id, orgId)
      });

      if (!orgProfileQuery || !orgProfileQuery.publicId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization profile not found'
        });
      }

      return {
        orgProfile: orgProfileQuery
      };
    }),

  setOrgProfile: orgProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32)
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
      const { orgName } = input;

      const isAdmin = await isUserAdminOfOrg(org);
      console.log('isAdmin', isAdmin);
      console.log('org', org);
      console.log('userId', userId);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      await db
        .update(orgs)
        .set({
          name: orgName
        })
        .where(eq(orgs.id, orgId));

      return {
        success: true
      };
    })
});
