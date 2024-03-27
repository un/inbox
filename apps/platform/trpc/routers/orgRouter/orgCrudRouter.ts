import { z } from 'zod';
import { router, accountProcedure } from '~/trpc/trpc';
import type { DBType } from '@u22n/database';
import { eq, and } from '@u22n/database/orm';
import {
  orgs,
  orgMembers,
  orgMemberProfiles,
  accounts
} from '@u22n/database/schema';
import { typeIdGenerator } from '@u22n/utils';
import { TRPCError } from '@trpc/server';
import { blockedUsernames, reservedUsernames } from '~/utils/signup';

async function validateOrgSlug(
  db: DBType,
  slug: string
): Promise<{
  available: boolean;
  error: string | null;
}> {
  const orgId = await db
    .select({ id: orgs.id })
    .from(orgs)
    .where(eq(orgs.slug, slug));
  if (orgId.length !== 0) {
    return {
      available: false,
      error: 'Already taken'
    };
  }
  if (blockedUsernames.includes(slug.toLowerCase())) {
    return {
      available: false,
      error: 'Org slug not allowed'
    };
  }
  if (reservedUsernames.includes(slug.toLowerCase())) {
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
  checkSlugAvailability: accountProcedure
    .input(
      z.object({
        slug: z
          .string()
          .min(5)
          .max(64)
          .regex(/^[a-zA-Z0-9]*$/, {
            message: 'Only letters and numbers'
          })
      })
    )
    .query(async ({ ctx, input }) => {
      return await validateOrgSlug(ctx.db, input.slug);
    }),

  createNewOrg: accountProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32),
        orgSlug: z
          .string()
          .min(5)
          .max(64)
          .regex(/^[a-zA-Z0-9]*$/, {
            message: 'Only letters and numbers'
          })
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const newPublicId = typeIdGenerator('org');

      const insertOrgResponse = await db.insert(orgs).values({
        ownerId: accountId,
        name: input.orgName,
        slug: input.orgSlug,
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
              avatarId: true,
              name: true,
              slug: true
            }
          }
        }
      });

      const adminOrgSlugs = orgMembersQuery
        .filter((orgMember) => orgMember.role === 'admin')
        .map((orgMember) => orgMember.org.slug);

      return {
        userOrgs: orgMembersQuery,
        adminOrgSlugs: adminOrgSlugs
      };
    })
});
