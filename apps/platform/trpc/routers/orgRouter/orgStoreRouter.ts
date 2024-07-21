import { isAccountAdminOfOrg } from '~platform/utils/account';
import { router, orgProcedure } from '~platform/trpc/trpc';
import { accounts, domains } from '@u22n/database/schema';
import { and, eq, lte, or } from '@u22n/database/orm';
import { datePlus } from '@u22n/utils/ms';
import { TRPCError } from '@trpc/server';

export const storeRouter = router({
  getStoreData: orgProcedure.query(async ({ ctx, input }) => {
    const { db, account } = ctx;
    const accountId = account.id;

    const storeInitData = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
      columns: {
        username: true,
        publicId: true
      },
      with: {
        orgMemberships: {
          columns: {},
          with: {
            profile: {
              columns: {
                firstName: true,
                lastName: true,
                avatarTimestamp: true,
                publicId: true,
                title: true,
                blurb: true
              }
            },
            org: {
              columns: {
                shortcode: true,
                publicId: true,
                name: true,
                avatarTimestamp: true
              }
            }
          }
        }
      }
    });
    if (!storeInitData) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Account not found'
      });
    }

    const orgsTransformed = storeInitData.orgMemberships.map(
      ({ org, profile }) => ({
        name: org.name,
        publicId: org.publicId,
        shortcode: org.shortcode,
        avatarTimestamp: org.avatarTimestamp,
        orgMemberProfile: profile
      })
    );

    const currentOrg = orgsTransformed.find(
      (o) => o.shortcode === input.orgShortcode
    );

    if (!currentOrg) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invalid org short code'
      });
    }

    const { username, publicId } = storeInitData;

    const transformed = {
      user: { publicId, username },
      orgs: orgsTransformed,
      currentOrg
    };

    return transformed;
  }),

  getOrgIssues: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;

    const isAdmin = await isAccountAdminOfOrg(org);
    if (!isAdmin) {
      // We don't need to throw an error for this, if the user is not admin just return an empty array
      return {
        issues: []
      };
    }

    const domainsWithIssues = await db.query.domains.findMany({
      where: and(
        eq(domains.orgId, org.id),
        eq(domains.disabled, false),
        or(
          eq(domains.domainStatus, 'disabled'),
          eq(domains.domainStatus, 'unverified'),
          eq(domains.sendingMode, 'disabled'),
          eq(domains.receivingMode, 'disabled')
        ),
        lte(domains.createdAt, datePlus('-1 day'))
      ),
      columns: {
        publicId: true,
        domain: true,
        domainStatus: true,
        sendingMode: true,
        receivingMode: true,
        verifiedAt: true,
        createdAt: true
      }
    });

    const domainIssues = domainsWithIssues.map((domain) => ({
      id: `domain_dns_issue:${domain.publicId}` as const,
      errorMessage: ['unverified', 'disabled'].includes(domain.domainStatus)
        ? domain.verifiedAt
          ? domain.verifiedAt.getTime() <= datePlus('-7 days').getTime()
            ? 'Your Domain has been disabled due to incorrect Verification.'
            : 'Your Domain has been unverified recently.'
          : domain.createdAt >= datePlus('-3 days')
            ? 'Your Domain has been disabled.'
            : 'Your Domain is unverified.'
        : domain.sendingMode === 'disabled'
          ? 'Your Domain has been disabled for sending.'
          : domain.receivingMode === 'disabled'
            ? 'Your Domain has been disabled for receiving.'
            : 'Your Domain has been disabled. Please contact support.',
      data: domain
    }));

    return {
      issues: domainIssues
    };
  })
});
