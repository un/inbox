import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, userProcedure } from '../../trpc';
import type { DBType } from '@uninbox/database';
import { and, eq, or } from '@uninbox/database/orm';
import {
  accounts
} from '@uninbox/database/schema';
import { nanoId, zodSchemas } from '@uninbox/utils';
import { TRPCError } from '@trpc/server';

export const securityRouter = router({
 
  getUserOrgProfile: userProcedure
    // .input(
    //   z
    //     .object({
    //       orgPublicId: zodSchemas.nanoId.optional(),
    //       orgSlug: z.string().min(1).max(32).optional()
    //     })
    //     .strict()
    // )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user.id;

      // let orgId: number | null = null;
      // if (input.orgPublicId || input.orgSlug) {
      //   const orgQuery = await db.query.orgs.findFirst({
      //     where: input.orgPublicId
      //       ? eq(orgs.publicId, input.orgPublicId)
      //       : input.orgSlug
      //         ? eq(orgs.slug, input.orgSlug)
      //         : eq(orgs.id, 0),
      //     columns: {
      //       id: true
      //     }
      //   });
      //   orgId = orgQuery?.id || null;
      // }
      // if ((input.orgPublicId || input.orgSlug) && !orgId) {
      //   throw new TRPCError({
      //     code: 'NOT_FOUND',
      //     message:
      //       'Could not find your organization profile, please contact support.'
      //   });
      // }

      const credentialsQuery = await db.query.accounts.findFirst({
        where: eq(accounts.userId, userId),
        columns: {
          passwordEnabled: true,
          passwordHash: true,
          recoveryEmail: true,
          emailVerified: true,
          passkeysEnabled: true
        }
      });

      if (!credentialsQuery || !credentialsQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'We couldnt find your profile, please contact support.'
        });
      }

      // TODO: Switch to FindMany when supporting single user multiple profiles to orgs

      return {
        profile: credentialsQuery
      };
    }),
  // updateUserProfile: userProcedure
  //   .input(
  //     z.object({
  //       profilePublicId: zodSchemas.nanoId,
  //       fName: z.string(),
  //       lName: z.string(),
  //       title: z.string(),
  //       blurb: z.string(),
  //       imageId: z.string().uuid().optional().nullable(),
  //       handle: z.string().min(2).max(20),
  //       defaultProfile: z.boolean().optional().default(false)
  //     })
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     const { db, user } = ctx;
  //     const userId = user.id;

  //     await db
  //       .update(userProfiles)
  //       .set({
  //         firstName: input.fName,
  //         lastName: input.lName,
  //         title: input.title,
  //         blurb: input.blurb,
  //         handle: input.handle
  //       })
  //       .where(
  //         and(
  //           eq(userProfiles.publicId, input.profilePublicId),
  //           eq(userProfiles.userId, userId)
  //         )
  //       );

  //     return {
  //       success: true
  //     };
  //   })
});

