import { z } from 'zod';
import { router, protectedProcedure, limitedProcedure } from '../../../trpc';
import { and, eq, or } from '@uninbox/database/orm';
import { orgs, orgMembers, domains } from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';
import dns from 'dns';
import { verifyDns } from '~/server/utils/verifyDns';
import { isUserInOrg } from '~/server/utils/dbQueries';

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

      const userOrg = await isUserInOrg({
        userId,
        orgPublicId
      });

      if (!userOrg) {
        return {
          error: 'User not in org'
        };
      }
      if (userOrg.role !== 'admin') {
        return {
          error: 'User not admin'
        };
      }
      // END TODO

      const domainRecords = await dns.promises.resolveAny(domainName);
      if (!domainRecords || domainRecords.length === 0) {
        return {
          error: 'Domain does not exist or is not registered'
        };
      }

      const existingDomains = await db.read.query.domains.findFirst({
        where: eq(domains.domain, domainName),
        columns: {
          id: true,
          domainStatus: true
        }
      });

      if (existingDomains && existingDomains.domainStatus === 'active') {
        return {
          error: 'Domain already in use'
        };
      }

      const mailBridgeResponse =
        await mailBridgeTrpcClient.postal.domains.createDomain.mutate({
          orgId: +userOrg.orgId,
          orgPublicId: orgPublicId,
          domainName: domainName
        });

      if (!mailBridgeResponse) {
        return {
          error: 'Error creating domain'
        };
      }

      await db.write.insert(domains).values({
        publicId: newPublicId,
        orgId: +userOrg.orgId,
        domain: domainName,
        postalHost: mailBridgeResponse.postalServerUrl || '',
        dkimKey: mailBridgeResponse.dkimKey,
        dkimValue: mailBridgeResponse.dkimValue,
        postalId: mailBridgeResponse.domainId,
        forwardingAddress: mailBridgeResponse.forwardingAddress,
        receivingMode: 'disabled',
        sendingMode: 'disabled',
        domainStatus: 'pending'
      });

      return {
        domainId: newPublicId
      };
    }),

  getDomain: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        domainPublicId: z.string().min(3).max(nanoIdLength),
        newDomain: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { orgPublicId, domainPublicId } = input;
      const userId = user.userId || 0;

      const dbReplica = input.newDomain ? db.write : db.read;

      console.log({ input });

      const userOrg = await isUserInOrg({
        userId,
        orgPublicId
      });

      if (!userOrg) {
        return {
          error: 'User not in org'
        };
      }
      if (userOrg.role !== 'admin') {
        return {
          error: 'User not admin'
        };
      }

      const domainResponse = await dbReplica.query.domains.findFirst({
        where: and(
          eq(domains.publicId, domainPublicId),
          eq(domains.orgId, +userOrg.orgId)
        ),
        columns: {
          publicId: true,
          domain: true,
          forwardingAddress: true,
          createdAt: true,
          sendingMode: true,
          receivingMode: true,
          domainStatus: true
        }
      });

      return {
        domainData: domainResponse
      };
    }),

  getDomainDns: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        domainPublicId: z.string().min(3).max(nanoIdLength),
        newDomain: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { orgPublicId, domainPublicId } = input;
      const userId = user.userId || 0;
      const postalRootUrl = useRuntimeConfig().mailBridge
        .postalRootUrl as string;

      const dbReplica = input.newDomain ? db.write : db.read;

      const userOrg = await isUserInOrg({
        userId,
        orgPublicId
      });

      if (!userOrg) {
        return {
          error: 'User not in org'
        };
      }

      const domainResponse = await dbReplica.query.domains.findFirst({
        where: and(
          eq(domains.publicId, domainPublicId),
          eq(domains.orgId, +userOrg.orgId)
        ),
        columns: {
          id: true,
          domain: true,
          dkimKey: true,
          dkimValue: true,
          postalHost: true,
          lastDnsCheckAt: true,
          sendingMode: true,
          receivingMode: true,
          domainStatus: true,
          forwardingAddress: true,
          createdAt: true
        }
      });

      if (!domainResponse) {
        return {
          error: 'Domain not found'
        };
      }

      if (!domainResponse.dkimKey || !domainResponse.dkimValue) {
        return {
          error: 'Domain not ready'
        };
      }

      const dnsResult = await verifyDns({
        domainName: domainResponse.domain,
        postalUrl: domainResponse.postalHost,
        postalRootUrl: postalRootUrl,
        dkimKey: domainResponse.dkimKey,
        dkimValue: domainResponse.dkimValue
      });

      let domainStatus: 'active' | 'pending' | 'disabled' =
        domainResponse.domainStatus;
      let domainSendingMode: 'native' | 'external' | 'disabled' =
        domainResponse.sendingMode;
      let domainReceivingMode: 'native' | 'forwarding' | 'disabled' =
        domainResponse.receivingMode;

      const threeDaysInMilliseconds = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
      const domainOlderThanThreeDays =
        new Date().getTime() - domainResponse.createdAt.getTime() >
        threeDaysInMilliseconds;

      if (domainOlderThanThreeDays) {
        if (
          dnsResult.dkim.valid ||
          dnsResult.spf.valid ||
          dnsResult.returnPath.valid ||
          dnsResult.mx.valid
        ) {
          domainStatus = 'active';
        } else {
          domainStatus = 'disabled';
          domainSendingMode = 'disabled';
          domainReceivingMode = 'disabled';
        }
      }

      if (domainStatus !== 'disabled') {
        const validSendingRecords =
          dnsResult.dkim.valid &&
          dnsResult.spf.valid &&
          dnsResult.returnPath.valid;

        const validReceivingRecords = dnsResult.mx.valid;

        const anyValidRecords =
          dnsResult.dkim.valid ||
          dnsResult.spf.valid ||
          dnsResult.returnPath.valid ||
          dnsResult.mx.valid;

        !validSendingRecords
          ? (domainSendingMode = 'disabled')
          : (domainSendingMode = 'native');

        if (!validReceivingRecords) {
          domainReceivingMode !== 'disabled'
            ? (domainReceivingMode = 'forwarding')
            : (domainReceivingMode = 'disabled');
        } else {
          domainReceivingMode = 'native';
        }

        domainStatus === 'pending' && anyValidRecords
          ? (domainStatus = 'active')
          : (domainStatus = 'pending');

        await db.write
          .update(domains)
          .set({
            mxDnsValid: dnsResult.mx.valid,
            dkimDnsValid: dnsResult.dkim.valid,
            spfDnsValid: dnsResult.spf.valid,
            returnPathDnsValid: dnsResult.returnPath.valid,
            receivingMode: domainReceivingMode,
            sendingMode: domainSendingMode,
            lastDnsCheckAt: new Date(),
            domainStatus: domainStatus
          })
          .where(eq(domains.id, domainResponse.id));
      }

      if (domainStatus === 'disabled') {
        await db.write
          .update(domains)
          .set({
            receivingMode: 'disabled',
            sendingMode: 'disabled',
            lastDnsCheckAt: new Date(),
            domainStatus: 'disabled',
            disabledAt: new Date()
          })
          .where(eq(domains.id, domainResponse.id));
      }

      return {
        dns: dnsResult,
        domainStatus: domainStatus,
        domainSendingMode: domainSendingMode,
        domainReceivingMode: domainReceivingMode,
        forwardingAddress: domainResponse.forwardingAddress,
        checked: new Date()
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
          domainStatus: true,
          receivingMode: true,
          sendingMode: true,
          forwardingAddress: true,
          createdAt: true,
          lastDnsCheckAt: true
        }
      });

      return {
        domainData: domainResponse
      };
    })
});
