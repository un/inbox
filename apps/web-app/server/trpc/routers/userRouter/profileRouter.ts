import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, userProcedure } from '../../trpc';
import type { DBType } from '@uninbox/database';
import { and, eq, or } from '@uninbox/database/orm';
import {
  users,
  userProfiles,
  orgs,
  userProfilesToOrgs,
  orgMembers
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdSchema } from '@uninbox/utils';
import { TRPCError } from '@trpc/server';

export const profileRouter = router({
  generateAvatarUploadUrl: userProcedure.query(async ({ ctx, input }) => {
    const { user } = ctx;
    const userId = user.id;
    const config = useRuntimeConfig();

    const formData = new FormData();
    formData.append('metadata', `{"userId":"${userId}"}`);

    //@ts-ignore - stack depth issue
    const uploadSignedURL: UploadSignedURLResponse = await $fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.cf.accountId}/images/v2/direct_upload`,
      {
        method: 'post',
        headers: {
          authorization: `Bearer ${config.cf.token}`
        },
        body: formData
      }
    );
    return uploadSignedURL.result;
  }),

  awaitAvatarUpload: userProcedure
    .input(
      z.object({
        uploadId: z.string().uuid()
      })
    )
    .query(async ({ ctx, input }) => {
      const config = useRuntimeConfig();
      async function fetchUntilNotDraft() {
        const imageUploadObject: ImageUploadObjectResponse = await $fetch(
          `https://api.cloudflare.com/client/v4/accounts/${config.cf.accountId}/images/v1/${input.uploadId}`,
          {
            method: 'get',
            headers: {
              authorization: `Bearer ${config.cf.token}`
            }
          }
        );
        if (imageUploadObject.result.draft) {
          // Wait for 1 second and then retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return fetchUntilNotDraft();
        } else {
          return imageUploadObject;
        }
      }

      const finalImageUploadObject = await fetchUntilNotDraft();
      const imageId = finalImageUploadObject.result.id;
      return imageId;
    }),

  createProfile: userProcedure
    .input(
      z.object({
        fName: z.string(),
        lName: z.string(),
        handle: z.string().min(2).max(20),
        defaultProfile: z.boolean().optional().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user.id;

      const newPublicId = nanoId();
      const insertUserProfileResponse = await db.insert(userProfiles).values({
        userId: userId,
        publicId: newPublicId,
        firstName: input.fName,
        lastName: input.lName,
        defaultProfile: input.defaultProfile,
        handle: input.handle
      });

      if (!insertUserProfileResponse.insertId) {
        console.log(insertUserProfileResponse);
        return {
          success: false,
          profileId: null,
          error:
            'Something went wrong, please retry. Contact our team if it persists'
        };
      }
      return {
        success: true,
        profileId: newPublicId,
        error: null
      };
    }),
  getUserOrgProfile: userProcedure
    .input(
      z
        .object({
          orgPublicId: nanoIdSchema.optional(),
          orgSlug: z.string().min(1).max(32).optional()
        })
        .strict()
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user.id;

      let orgId: number | null = null;
      if (input.orgPublicId || input.orgSlug) {
        const orgQuery = await db.query.orgs.findFirst({
          where: input.orgPublicId
            ? eq(orgs.publicId, input.orgPublicId)
            : input.orgSlug
              ? eq(orgs.slug, input.orgSlug)
              : eq(orgs.id, 0),
          columns: {
            id: true
          }
        });
        orgId = orgQuery?.id || null;
      }
      if ((input.orgPublicId || input.orgSlug) && !orgId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message:
            'Could not find your organization profile, please contact support.'
        });
      }

      const userOrgMembershipQuery = await db.query.orgMembers.findFirst({
        where: !orgId
          ? eq(orgMembers.userId, userId)
          : and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, orgId)),
        columns: {
          userProfileId: true
        },
        with: {
          profile: {
            columns: {
              publicId: true,
              avatarId: true,
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
          message: 'We couldnt find your profile, please contact support.'
        });
      }

      // TODO: Switch to FindMany when supporting single user multiple profiles to orgs

      return {
        profile: userOrgMembershipQuery?.profile
      };
    }),
  updateUserProfile: userProcedure
    .input(
      z.object({
        profilePublicId: nanoIdSchema,
        fName: z.string(),
        lName: z.string(),
        title: z.string(),
        blurb: z.string(),
        imageId: z.string().uuid().optional().nullable(),
        handle: z.string().min(2).max(20),
        defaultProfile: z.boolean().optional().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user.id;

      await db
        .update(userProfiles)
        .set({
          firstName: input.fName,
          lastName: input.lName,
          title: input.title,
          blurb: input.blurb,
          handle: input.handle
        })
        .where(
          and(
            eq(userProfiles.publicId, input.profilePublicId),
            eq(userProfiles.userId, userId)
          )
        );

      return {
        success: true
      };
    })
});

// Types
interface ImageUploadObjectResponse {
  result: {
    id: string;
    metadata: {
      key: string;
    };
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
    draft: boolean;
  };
  success: boolean;
  errors: string[];
  messages: string[];
}

interface UploadSignedURLResponse {
  result: Result;
  success: boolean;
  errors: string[];
  messages: string[];
}

interface Result {
  id: string;
  uploadURL: string;
}
