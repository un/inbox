import {
  orgs,
  orgMembers,
  orgMemberProfiles,
  accounts
} from '@u22n/database/schema';
import { blockedUsernames, reservedUsernames } from '~platform/utils/signup';
import { router, accountProcedure } from '~platform/trpc/trpc';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { eq, and, like } from '@u22n/database/orm';
import type { DBType } from '@u22n/database';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

async function validateOrgShortcode(
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
  checkShortcodeAvailability: accountProcedure
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
      return await validateOrgShortcode(ctx.db, input.shortcode);
    }),

  generateOrgShortcode: accountProcedure
    .input(
      z.object({
        orgName: z.string().min(5)
      })
    )
    .query(async ({ ctx, input }) => {
      const autoShortcode = input.orgName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const existingOrgs = await ctx.db.query.orgs.findMany({
        where: like(orgs.shortcode, `${autoShortcode}%`),
        columns: {
          shortcode: true
        }
      });

      const existingShortcodeList = existingOrgs.map((org) => org.shortcode);
      if (
        existingShortcodeList.length === 0 ||
        !existingShortcodeList.includes(autoShortcode)
      ) {
        return { shortcode: autoShortcode.substring(0, 32) };
      }
      let currentSuffix = existingShortcodeList.length;
      let retries = 0;
      let newShortcode = `${autoShortcode.substring(0, 28)}${currentSuffix}`;

      while (existingShortcodeList.includes(newShortcode)) {
        currentSuffix++;
        newShortcode = `${autoShortcode.substring(0, 28)}${currentSuffix}`;
        retries++;
        if (retries > 30) {
          throw new TRPCError({
            code: 'CONFLICT',
            message:
              'Failed to generate unique shortcode, please type one manually'
          });
        }
      }
      return { shortcode: newShortcode };
    }),

  createNewOrg: accountProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32),
        orgShortcode: z
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

      const shortcodeAvailability = await validateOrgShortcode(
        db,
        input.orgShortcode
      );

      if (!shortcodeAvailability.available) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: shortcodeAvailability.error ?? 'Org shortcode not available'
        });
      }

      const newPublicId = typeIdGenerator('org');

      const insertOrgResponse = await db.insert(orgs).values({
        ownerId: accountId,
        name: input.orgName,
        shortcode: input.orgShortcode,
        publicId: newPublicId
      });
      const orgId = +insertOrgResponse.insertId;

      const newProfilePublicId = typeIdGenerator('orgMemberProfile');

      const { username } =
        (await db.query.accounts.findFirst({
          where: eq(accounts.id, accountId),
          columns: {
            username: true
          }
        })) ?? {};

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
          publicId: newProfilePublicId,
          accountId: accountId,
          firstName: username,
          lastName: '',
          handle: username,
          title: '',
          blurb: ''
        });

      const newOrgMemberPublicId = typeIdGenerator('orgMembers');
      await db.insert(orgMembers).values({
        orgId: orgId,
        publicId: newOrgMemberPublicId,
        role: 'admin',
        accountId: accountId,
        status: 'active',
        orgMemberProfileId: Number(newOrgMemberProfileInsert.insertId)
      });

      return {
        orgId: newPublicId,
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

      const whereAccountIsAdmin = input.onlyAdmin ?? false;

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

      const adminOrgShortcodes = orgMembersQuery
        .filter((orgMember) => orgMember.role === 'admin')
        .map((orgMember) => orgMember.org.shortcode);

      return {
        userOrgs: orgMembersQuery,
        adminOrgShortcodes: adminOrgShortcodes
      };
    })
});
