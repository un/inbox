import { z } from 'zod';
import { router, protectedProcedure, limitedProcedure } from '../../../trpc';
import { and, eq, or } from '@uninbox/database/orm';
import { orgs, orgMembers, domains } from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';
import dns from 'dns';

export const domainsRouter = router({
  createNewDomain: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        domainName: z.string().min(3).max(255)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      let { orgPublicId, domainName } = input;
      const newPublicId = nanoId();
      const userId = user.userId || 0;

      domainName = domainName.toLowerCase();
      const orgIdResponse = await db.read.query.orgMembers.findFirst({
        where: and(
          eq(
            orgMembers.orgId,
            db.read
              .select({ id: orgs.id })
              .from(orgs)
              .where(eq(orgs.publicId, orgPublicId))
          ),
          eq(orgMembers.userId, userId)
        ),
        columns: {
          orgId: true,
          role: true
        }
      });
      if (!orgIdResponse) {
        return {
          error: 'User not in org'
        };
      }
      if (orgIdResponse.role !== 'admin') {
        return {
          error: 'User not admin'
        };
      }

      const domainRecords = await dns.promises.resolveAny(domainName);
      if (!domainRecords || domainRecords.length === 0) {
        return {
          error: 'Domain does not exist'
        };
      }

      const existingDomains = await db.read.query.domains.findFirst({
        where: eq(domains.domain, domainName),
        columns: {
          id: true
        }
      });

      if (existingDomains) {
        return {
          error: 'Domain already exists'
        };
      }

      const mailBridgeResponse =
        await mailBridgeTrpcClient.postal.domains.createDomain.mutate({
          orgId: +orgIdResponse.orgId,
          orgPublicId: orgPublicId,
          domainName: domainName
        });

      await db.write.insert(domains).values({
        publicId: newPublicId,
        orgId: +orgIdResponse.orgId,
        domain: domainName,
        dnsStatus: 'pending',
        mode: 'native',
        postalHost: '', //
        status: 'active',
        dkimKey: mailBridgeResponse.dkimKey,
        dkimValue: mailBridgeResponse.dkimValue,
        postalId: mailBridgeResponse.domainId,
        forwardingAddress: mailBridgeResponse.forwardingAddress
      });

      return {
        domainId: newPublicId
      };
    }),

  getDomain: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        domainPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { orgPublicId, domainPublicId } = input;
      const newPublicId = nanoId();
      const userId = user.userId || 0;
      const newInviteToken = nanoIdToken();

      const orgIdResponse = await db.read.query.orgMembers.findFirst({
        where: and(
          eq(
            orgMembers.orgId,
            db.read
              .select({ id: orgs.id })
              .from(orgs)
              .where(eq(orgs.publicId, orgPublicId))
          ),
          eq(orgMembers.userId, userId)
        ),
        columns: {
          orgId: true,
          role: true
        }
      });
      if (!orgIdResponse) {
        return {
          error: 'User not in org'
        };
      }
      if (orgIdResponse.role !== 'admin') {
        return {
          error: 'User not admin'
        };
      }

      const domainResponse = await db.read.query.domains.findFirst({
        where: and(
          eq(domains.publicId, domainPublicId),
          eq(domains.orgId, +orgIdResponse.orgId)
        ),
        columns: {
          publicId: true,
          domain: true,
          mode: true,
          dnsStatus: true,
          status: true,
          forwardingAddress: true,
          dkimKey: true,
          dkimValue: true,
          createdAt: true,
          lastDnsCheckAt: true,
          statusUpdateAt: true
        }
      });

      return {
        domainData: domainResponse
      };
    }),

  getOrgDomains: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { orgPublicId } = input;
      const newPublicId = nanoId();
      const userId = user.userId || 0;
      const newInviteToken = nanoIdToken();

      const orgIdResponse = await db.read.query.orgMembers.findFirst({
        where: and(
          eq(
            orgMembers.orgId,
            db.read
              .select({ id: orgs.id })
              .from(orgs)
              .where(eq(orgs.publicId, orgPublicId))
          ),
          eq(orgMembers.userId, userId)
        ),
        columns: {
          orgId: true,
          role: true
        }
      });
      if (!orgIdResponse) {
        return {
          error: 'User not in org'
        };
      }

      const domainResponse = await db.read.query.domains.findMany({
        where: eq(domains.orgId, +orgIdResponse.orgId),
        columns: {
          publicId: true,
          domain: true,
          mode: true,
          dnsStatus: true,
          status: true,
          forwardingAddress: true,
          createdAt: true,
          lastDnsCheckAt: true,
          statusUpdateAt: true
        }
      });

      return {
        domainData: domainResponse
      };
    })
});
