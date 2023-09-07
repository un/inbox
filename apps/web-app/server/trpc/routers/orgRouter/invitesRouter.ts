import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../../trpc';
import type { DBType } from '@uninbox/database';
import { eq } from '@uninbox/database/orm';
import {
  users,
  userProfiles,
  orgs,
  orgMembers,
  postalServers
} from '@uninbox/database/schema';
import { nanoid } from '@uninbox/utils';

export const invitesRouter = router({
  createNewInvite: protectedProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      const newPublicId = nanoid();

      //! create org in the db

      //! create user membership to org (set as admin)

      //! create the org in postal

      //! save postal details in db
      const insertUserProfileResponse = await db.insert(userProfiles).values({
        //@ts-ignore TS dosnt know that userId must exist on protected procedures
        userId: ctx.user.userId,
        publicId: newPublicId
        // avatarId: input.imageId,
        // firstName: input.fName,
        // lastName: input.lName
      });

      if (!insertUserProfileResponse.insertId) {
        console.log(insertUserProfileResponse);
        return {
          success: false,
          orgId: null,
          orgName: null,
          error:
            'Something went wrong, please retry. Contact our team if it persists'
        };
      }
      return {
        success: true,
        orgId: newPublicId,
        orgName: input.orgName,
        error: null
      };
    }),
  viewInvites: protectedProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      const newPublicId = nanoid();

      //! create org in the db

      //! create user membership to org (set as admin)

      //! create the org in postal

      //! save postal details in db
      const insertUserProfileResponse = await db.insert(userProfiles).values({
        //@ts-ignore TS dosnt know that userId must exist on protected procedures
        userId: ctx.user.userId,
        publicId: newPublicId
        // avatarId: input.imageId,
        // firstName: input.fName,
        // lastName: input.lName
      });

      if (!insertUserProfileResponse.insertId) {
        console.log(insertUserProfileResponse);
        return {
          success: false,
          orgId: null,
          orgName: null,
          error:
            'Something went wrong, please retry. Contact our team if it persists'
        };
      }
      return {
        success: true,
        orgId: newPublicId,
        orgName: input.orgName,
        error: null
      };
    }),
  redeemInvite: protectedProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      const newPublicId = nanoid();

      //! create org in the db

      //! create user membership to org (set as admin)

      //! create the org in postal

      //! save postal details in db
      const insertUserProfileResponse = await db.insert(userProfiles).values({
        //@ts-ignore TS dosnt know that userId must exist on protected procedures
        userId: ctx.user.userId,
        publicId: newPublicId
        // avatarId: input.imageId,
        // firstName: input.fName,
        // lastName: input.lName
      });

      if (!insertUserProfileResponse.insertId) {
        console.log(insertUserProfileResponse);
        return {
          success: false,
          orgId: null,
          orgName: null,
          error:
            'Something went wrong, please retry. Contact our team if it persists'
        };
      }
      return {
        success: true,
        orgId: newPublicId,
        orgName: input.orgName,
        error: null
      };
    }),
  deleteInvite: protectedProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      const newPublicId = nanoid();

      //! create org in the db

      //! create user membership to org (set as admin)

      //! create the org in postal

      //! save postal details in db
      const insertUserProfileResponse = await db.insert(userProfiles).values({
        //@ts-ignore TS dosnt know that userId must exist on protected procedures
        userId: ctx.user.userId,
        publicId: newPublicId
        // avatarId: input.imageId,
        // firstName: input.fName,
        // lastName: input.lName
      });

      if (!insertUserProfileResponse.insertId) {
        console.log(insertUserProfileResponse);
        return {
          success: false,
          orgId: null,
          orgName: null,
          error:
            'Something went wrong, please retry. Contact our team if it persists'
        };
      }
      return {
        success: true,
        orgId: newPublicId,
        orgName: input.orgName,
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
