import { z } from 'zod';
import { router, accountProcedure } from '../../trpc';
import { and, eq } from '@u22n/database/orm';
import { orgMemberProfiles, orgs, orgMembers } from '@u22n/database/schema';
import { typeIdValidator } from '@u22n/utils';
import { TRPCError } from '@trpc/server';

export const profileRouter = router({
  // createProfile: accountProcedure
  //   .input(
  //     z.object({
  //       fName: z.string(),
  //       lName: z.string(),
  //       handle: z.string().min(2).max(20),
  //       defaultProfile: z.boolean().optional().default(false)
  //     })
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     const { db, user } = ctx;
  //     const userId = user.id;

  //     const newPublicId = typeIdGenerator('orgMemberProfile');
  //     const insertUserProfileResponse = await db.insert(orgMemberProfiles).values({
  //       userId: userId,
  //       publicId: newPublicId,
  //       firstName: input.fName,
  //       lastName: input.lName,
  //       defaultProfile: input.defaultProfile,
  //       handle: input.handle
  //     });

  //     if (!insertUserProfileResponse.insertId) {
  //       return {
  //         success: false,
  //         profileId: null,
  //         error:
  //           'Something went wrong, please retry. Contact our team if it persists'
  //       };
  //     }
  //     return {
  //       success: true,
  //       profileId: newPublicId,
  //       error: null
  //     };
  //   }),
  getOrgMemberProfile: accountProcedure
    .input(
      z.object({
        orgPublicId: typeIdValidator('org').optional(),
        orgShortCode: z.string().min(1).max(32).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      let orgId: number | null = null;
      if (input.orgPublicId || input.orgShortCode) {
        const orgQuery = await db.query.orgs.findFirst({
          where: input.orgPublicId
            ? eq(orgs.publicId, input.orgPublicId)
            : input.orgShortCode
              ? eq(orgs.shortcode, input.orgShortCode)
              : eq(orgs.id, 0),
          columns: {
            id: true
          }
        });
        orgId = orgQuery?.id || null;
      }
      if ((input.orgPublicId || input.orgShortCode) && !orgId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message:
            'Could not find your organization profile, please contact support.'
        });
      }

      const userOrgMembershipQuery = await db.query.orgMembers.findFirst({
        where: !orgId
          ? eq(orgMembers.accountId, accountId)
          : and(
              eq(orgMembers.accountId, accountId),
              eq(orgMembers.orgId, orgId)
            ),
        columns: {
          orgMemberProfileId: true
        },
        with: {
          profile: {
            columns: {
              publicId: true,
              avatarTimestamp: true,
              firstName: true,
              lastName: true,
              handle: true,
              title: true,
              blurb: true
            }
          }
        }
      });

      if (!userOrgMembershipQuery || !userOrgMembershipQuery.profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "We couldn't find your profile, please contact support."
        });
      }

      return {
        profile: userOrgMembershipQuery?.profile
      };
    }),
  updateOrgMemberProfile: accountProcedure
    .input(
      z.object({
        profilePublicId: typeIdValidator('orgMemberProfile'),
        fName: z.string(),
        lName: z.string(),
        title: z.string(),
        blurb: z.string(),
        imageId: z.string().uuid().optional().nullable(),
        handle: z.string().min(2).max(20)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      await db
        .update(orgMemberProfiles)
        .set({
          firstName: input.fName,
          lastName: input.lName,
          title: input.title,
          blurb: input.blurb,
          handle: input.handle
        })
        .where(
          and(
            eq(orgMemberProfiles.publicId, input.profilePublicId),
            eq(orgMemberProfiles.accountId, accountId)
          )
        );

      return {
        success: true
      };
    }),

  deleteUserProfile: accountProcedure
    .input(
      z.object({
        profilePublicId: typeIdValidator('orgMemberProfile')
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const result = await db
        .delete(orgMemberProfiles)
        .where(
          and(
            eq(orgMemberProfiles.publicId, input.profilePublicId),
            eq(orgMemberProfiles.accountId, accountId)
          )
        );

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message:
            'Profile not found or you do not have permission to delete this profile.'
        });
      }

      return {
        success: true
      };
    })
});
