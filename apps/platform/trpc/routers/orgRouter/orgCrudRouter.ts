import { z } from 'zod';
import { router, accountProcedure } from '~platform/trpc/trpc';
import type { DBType } from '@u22n/database';
import { eq, and } from '@u22n/database/orm';
import {
  orgs,
  orgMembers,
  orgMemberProfiles,
  accounts,
  spaces,
  spaceMembers
} from '@u22n/database/schema';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { TRPCError } from '@trpc/server';
import { blockedUsernames, reservedUsernames } from '~platform/utils/signup';

async function validateOrgShortCode(
  db: DBType,
  shortcode: string
): Promise<{
  available: boolean;
  error: string | null;
}> {
  const orgId = await db
    .select({ id: orgs.id })
    .from(orgs)
    .where(eq(orgs.shortcode, shortcode));
  if (orgId.length !== 0) {
    return {
      available: false,
      error: 'Already taken'
    };
  }
  if (blockedUsernames.includes(shortcode.toLowerCase())) {
    return {
      available: false,
      error: 'Org shortcode not allowed'
    };
  }
  if (reservedUsernames.includes(shortcode.toLowerCase())) {
    return {
      available: false,
      error:
        'This organization name is currently reserved. If you own this trademark, please Contact Support'
    };
  }
  return {
    available: true,
    error: null
  };
}

export const crudRouter = router({
  checkShortCodeAvailability: accountProcedure
    .input(
      z.object({
        shortcode: z
          .string()
          .min(5)
          .max(64)
          .regex(/^[a-z0-9]*$/, {
            message: 'Only lowercase letters and numbers'
          })
      })
    )
    .query(async ({ ctx, input }) => {
      return await validateOrgShortCode(ctx.db, input.shortcode);
    }),

  createNewOrg: accountProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32),
        orgShortCode: z
          .string()
          .min(5)
          .max(64)
          .regex(/^[a-z0-9]*$/, {
            message: 'Only lowercase letters and numbers'
          })
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const shortcodeAvailability = await validateOrgShortCode(
        db,
        input.orgShortCode
      );

      if (!shortcodeAvailability.available) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: shortcodeAvailability.error || 'Org shortcode not available'
        });
      }

      const newOrgPublicId = typeIdGenerator('org');

      const insertOrgResponse = await db.insert(orgs).values({
        ownerId: accountId,
        name: input.orgName,
        shortcode: input.orgShortCode,
        publicId: newOrgPublicId
      });
      const orgId = Number(insertOrgResponse.insertId);

      const { username } =
        (await db.query.accounts.findFirst({
          where: eq(accounts.id, accountId),
          columns: {
            username: true
          }
        })) || {};

      if (!username) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found. Please contact support.'
        });
      }

      const newOrgMemberProfileInsert = await db
        .insert(orgMemberProfiles)
        .values({
          orgId: orgId,
          publicId: typeIdGenerator('orgMemberProfile'),
          accountId: accountId,
          firstName: username,
          lastName: '',
          handle: username,
          title: '',
          blurb: ''
        });

      const newOrgMemberPublicId = typeIdGenerator('orgMembers');
      const orgMemberResponse = await db.insert(orgMembers).values({
        orgId: orgId,
        publicId: newOrgMemberPublicId,
        role: 'admin',
        accountId: accountId,
        status: 'active',
        orgMemberProfileId: Number(newOrgMemberProfileInsert.insertId)
      });

      const newSpaceResponse = await db.insert(spaces).values({
        orgId: orgId,
        publicId: typeIdGenerator('spaces'),
        name: `${username}'s Personal Space`,
        type: 'shared',
        personalSpace: true,
        color: 'cyan',
        icon: 'house',
        createdByOrgMemberId: Number(orgMemberResponse.insertId),
        shortcode: `${username}-personal`
      });

      await db.insert(spaceMembers).values({
        orgId: orgId,
        spaceId: Number(newSpaceResponse.insertId),
        publicId: typeIdGenerator('spaceMembers'),
        orgMemberId: Number(orgMemberResponse.insertId),
        addedByOrgMemberId: Number(orgMemberResponse.insertId),
        role: 'admin',
        canCreate: true,
        canRead: true,
        canComment: true,
        canReply: true,
        canDelete: true,
        canChangeStatus: true,
        canSetStatusToClosed: true,
        canAddTags: true,
        canMoveToAnotherSpace: true,
        canAddToAnotherSpace: true,
        canMergeConvos: true,
        canAddParticipants: true
      });

      await db
        .update(orgMembers)
        .set({
          personalSpaceId: Number(newSpaceResponse.insertId)
        })
        .where(eq(orgMembers.id, Number(orgMemberResponse.insertId)));

      return {
        orgId: newOrgPublicId,
        orgName: input.orgName
      };
    }),

  getAccountOrgs: accountProcedure
    .input(
      z.object({
        onlyAdmin: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const whereAccountIsAdmin = input.onlyAdmin || false;

      const orgMembersQuery = await db.query.orgMembers.findMany({
        columns: {
          role: true
        },
        where: whereAccountIsAdmin
          ? and(
              eq(orgMembers.accountId, accountId),
              eq(orgMembers.role, 'admin')
            )
          : eq(orgMembers.accountId, accountId),
        with: {
          org: {
            columns: {
              publicId: true,
              avatarTimestamp: true,
              name: true,
              shortcode: true
            }
          }
        }
      });

      const adminOrgShortCodes = orgMembersQuery
        .filter((orgMember) => orgMember.role === 'admin')
        .map((orgMember) => orgMember.org.shortcode);

      return {
        userOrgs: orgMembersQuery,
        adminOrgShortCodes: adminOrgShortCodes
      };
    })
});
