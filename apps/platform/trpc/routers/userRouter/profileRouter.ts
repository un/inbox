import {
  orgMemberProfiles,
  orgs,
  orgMembers,
  spaces
} from '@u22n/database/schema';
import { router, accountProcedure } from '~platform/trpc/trpc';
import { validateSpaceShortCode } from '../spaceRouter/utils';
import { typeIdValidator } from '@u22n/utils/typeid';
import { and, eq } from '@u22n/database/orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const profileRouter = router({
  getOrgMemberProfile: accountProcedure
    .input(
      z.object({
        orgPublicId: typeIdValidator('org').optional(),
        orgShortcode: z.string().min(1).max(32).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      let orgId: number | null = null;
      if (Boolean(input.orgPublicId ?? input.orgShortcode)) {
        const orgQuery = await db.query.orgs.findFirst({
          where: input.orgPublicId
            ? eq(orgs.publicId, input.orgPublicId)
            : input.orgShortcode
              ? eq(orgs.shortcode, input.orgShortcode)
              : eq(orgs.id, 0),
          columns: {
            id: true
          }
        });
        orgId = orgQuery?.id ?? null;
      }
      if (Boolean(input.orgPublicId ?? input.orgShortcode) && !orgId) {
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

      if (!userOrgMembershipQuery?.profile) {
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
        name: z.string(),
        title: z.string().optional(),
        blurb: z.string().optional(),
        handle: z.string().min(2).max(20).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;
      const [firstName, ...lastName] = input.name.split(' ');

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
              personalSpaceId: true
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
          firstName,
          lastName: lastName.join(' '),
          title: input.title,
          blurb: input.blurb,
          handle: input.handle
        })
        .where(eq(orgMemberProfiles.id, orgMemberProfileQuery.id));

      if (orgMemberProfileQuery.orgMember.personalSpaceId) {
        const validatedShortcode = await validateSpaceShortCode({
          db: db,
          shortcode: `${input.handle}-personal`,
          orgId: orgMemberProfileQuery.orgId,
          spaceId: orgMemberProfileQuery.orgMember.personalSpaceId
        });

        await db
          .update(spaces)
          .set({
            name: `${firstName}'s Personal Space`,
            shortcode: validatedShortcode.shortcode,
            description: `${firstName}${lastName.length ? ' ' + lastName.join(' ') : ''}'s Personal Space`
          })
          .where(
            eq(spaces.id, orgMemberProfileQuery.orgMember.personalSpaceId)
          );
      }

      return {
        success: true
      };
    })
});
