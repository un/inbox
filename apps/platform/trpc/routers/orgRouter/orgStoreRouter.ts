import { router, orgProcedure, accountProcedure } from '~platform/trpc/trpc';
import { validateOrgShortcode } from '~platform/utils/orgShortcode';
import { isAccountAdminOfOrg } from '~platform/utils/account';
import { and, eq, lte, or } from '@u22n/database/orm';
import { domains } from '@u22n/database/schema';
import { datePlus } from '@u22n/utils/ms';
import { z } from 'zod';

export const storeRouter = router({
  hasAccessToOrg: accountProcedure
    .input(z.object({ orgShortcode: z.string() }))
    .query(async ({ ctx, input }) => {
      const { account } = ctx;
      const org = await validateOrgShortcode(input.orgShortcode);
      if (!org?.members.find((m) => m.accountId === account.id)) {
        return { hasAccess: false };
      }
      return { hasAccess: true };
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
