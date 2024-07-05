import { z } from 'zod';
import { router, accountProcedure } from '~platform/trpc/trpc';
import { and, eq } from '@u22n/database/orm';
import {
  orgMemberProfiles,
  orgs,
  orgMembers,
  spaces
} from '@u22n/database/schema';
import { typeIdValidator } from '@u22n/utils/typeid';
import { TRPCError } from '@trpc/server';
import { validateSpaceShortCode } from '../spaceRouter/spaceRouter';

export const profileRouter = router({
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

      const orgMemberProfileQuery = await db.query.orgMemberProfiles.findFirst({
        where: and(
          eq(orgMemberProfiles.accountId, accountId),
          eq(orgMemberProfiles.publicId, input.profilePublicId)
        ),
        columns: {
          id: true,
          orgId: true,
          handle: true
        },
        with: {
          orgMember: {
            columns: {
              id: true,
              personalSpace: true
            }
          }
        }
      });

      if (!orgMemberProfileQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found'
        });
      }

      await db
        .update(orgMemberProfiles)
        .set({
          firstName: input.fName,
          lastName: input.lName,
          title: input.title,
          blurb: input.blurb,
          handle: input.handle
        })
        .where(eq(orgMemberProfiles.id, orgMemberProfileQuery.id));

      if (orgMemberProfileQuery.orgMember.personalSpace) {
        const validatedShortcode = await validateSpaceShortCode({
          db: db,
          shortcode: `${input.handle}-personal`,
          orgId: orgMemberProfileQuery.orgId,
          spaceId: orgMemberProfileQuery.orgMember.personalSpace
        });

        await db
          .update(spaces)
          .set({
            name: `${input.fName}'s Personal Space`,
            shortcode: validatedShortcode.shortcode,
            description: `${input.fName}${input.lName ? ' ' + input.lName : ''}'s Personal Space`
          })
          .where(eq(spaces.id, orgMemberProfileQuery.orgMember.personalSpace));
      }

      return {
        success: true
      };
    })
});
