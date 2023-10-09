import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../../trpc';
import type { DBType } from '@uninbox/database';
import { eq } from '@uninbox/database/orm';
import { users, userProfiles } from '@uninbox/database/schema';
import { nanoId } from '@uninbox/utils';

export const profileRouter = router({
  generateAvatarUploadUrl: protectedProcedure.query(async ({ ctx, input }) => {
    const config = useRuntimeConfig();

    const formData = new FormData();
    formData.append('metadata', `{"userId":"${ctx.user.userId}"}`);

    // https://api.cloudflare.com/client/v4/accounts/0821901a4d9392ed1dfc645608f19474/images/v2/direct_upload
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

  awaitAvatarUpload: protectedProcedure
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

  createProfile: protectedProcedure
    .input(
      z.object({
        fName: z.string(),
        lName: z.string(),
        imageId: z.string().uuid().optional().nullable(),
        handle: z.string().min(2).max(20),
        defaultProfile: z.boolean().optional().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      const newPublicId = nanoId();
      const insertUserProfileResponse = await db.write
        .insert(userProfiles)
        .values({
          //@ts-ignore TS dosnt know that userId must exist on protected procedures
          userId: ctx.user.userId,
          publicId: newPublicId,
          avatarId: input.imageId,
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
          avatarId: null,
          error:
            'Something went wrong, please retry. Contact our team if it persists'
        };
      }
      return {
        success: true,
        profileId: newPublicId,
        avatarId: input.imageId,
        error: null
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
