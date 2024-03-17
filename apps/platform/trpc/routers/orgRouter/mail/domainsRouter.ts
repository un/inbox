import { z } from 'zod';
import { router, orgProcedure } from '../../../trpc';
import { and, eq } from '@u22n/database/orm';
import {
  domains,
  postalServers,
  orgPostalConfigs
} from '@u22n/database/schema';
import { nanoId, zodSchemas } from '@u22n/utils';
import { TRPCError } from '@trpc/server';
import { isUserAdminOfOrg } from '../../../../utils/user';
import { mailBridgeTrpcClient } from '../../../../utils/tRPCServerClients';
import { lookupNS } from '@u22n/utils/dns';

// TODO: investigate DNS issues

export const domainsRouter = router({
  createNewDomain: orgProcedure
    .input(
      z.object({
        domainName: z.string().min(3).max(255)
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org.id;
      const orgPublicId = org.publicId;
      const newPublicId = nanoId();

      const domainName = input.domainName.toLowerCase();

      const isAdmin = await isUserAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const dnsData = await lookupNS(domainName);
      if (
        dnsData.success === false &&
        dnsData.code === 3 // 3 -> The domain name does not exist
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Domain does not exist or is not registered'
        });
      }

      const existingDomains = await db.query.domains.findFirst({
        where: eq(domains.domain, domainName),
        columns: {
          id: true,
          domainStatus: true
        }
      });

      if (
        existingDomains &&
        (existingDomains.domainStatus === 'active' ||
          existingDomains.domainStatus === 'pending')
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Domain already in use'
        });
      }

      // check if org has a postal server, if not create one
      const orgPostalServerQuery = await db.query.postalServers.findFirst({
        where: and(
          eq(postalServers.orgId, orgId),
          eq(postalServers.type, 'email')
        ),
        columns: {
          id: true
        }
      });
      if (!orgPostalServerQuery) {
        const createMailBridgeOrgResponse =
          await mailBridgeTrpcClient.postal.org.createPostalOrg.mutate({
            orgId: orgId,
            orgPublicId: orgPublicId
          });
        await db.insert(postalServers).values({
          orgId: orgId,
          publicId: createMailBridgeOrgResponse.postalServer.serverPublicId,
          type: 'email',
          apiKey: createMailBridgeOrgResponse.postalServer.apiKey,
          smtpKey: createMailBridgeOrgResponse.postalServer.smtpKey
        });
        const orgPostalConfigResponse =
          await db.query.orgPostalConfigs.findFirst({
            where: eq(orgPostalConfigs.orgId, orgId)
          });
        if (!orgPostalConfigResponse) {
          await db.insert(orgPostalConfigs).values({
            orgId: orgId,
            host: createMailBridgeOrgResponse.config.host,
            ipPools: [createMailBridgeOrgResponse.config.ipPools],
            defaultIpPool: createMailBridgeOrgResponse.config.defaultIpPool
          });
        }
      }

      const mailBridgeResponse =
        await mailBridgeTrpcClient.postal.domains.createDomain.mutate({
          orgId: orgId,
          orgPublicId: orgPublicId,
          domainName: domainName
        });

      if (!mailBridgeResponse) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while creating the domain, contact support'
        });
      }

      await db.insert(domains).values({
        publicId: newPublicId,
        orgId: orgId,
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

  getDomain: orgProcedure
    .input(
      z.object({
        domainPublicId: zodSchemas.nanoId,
        newDomain: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, org } = ctx;

      const orgId = org?.id;
      const { domainPublicId } = input;

      // Handle when adding database replicas
      const dbReplica = db;

      const isAdmin = await isUserAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const domainResponse = await dbReplica.query.domains.findFirst({
        where: and(
          eq(domains.publicId, domainPublicId),
          eq(domains.orgId, orgId)
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

  getDomainDns: orgProcedure
    .input(
      z.object({
        domainPublicId: z.string(),
        refresh: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;
      const { domainPublicId } = input;

      // Handle when adding database replicas
      const dbReplica = db;

      const isAdmin = await isUserAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const domainResponse = await dbReplica.query.domains.findFirst({
        where: and(
          eq(domains.publicId, domainPublicId),
          eq(domains.orgId, orgId)
        ),
        columns: {
          id: true,
          domain: true,
          dkimKey: true,
          dkimValue: true,
          postalHost: true,
          postalId: true,
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

      let domainStatus: 'active' | 'pending' | 'disabled' =
        domainResponse.domainStatus;
      let domainSendingMode: 'native' | 'external' | 'disabled' =
        domainResponse.sendingMode;
      let domainReceivingMode: 'native' | 'forwarding' | 'disabled' =
        domainResponse.receivingMode;

      const dnsResult =
        await mailBridgeTrpcClient.postal.domains.refreshDomainDns.query({
          postalDomainId: domainResponse.postalId
        });

      const threeDaysInMilliseconds = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
      const domainOlderThanThreeDays =
        new Date().getTime() - domainResponse.createdAt.getTime() >
        threeDaysInMilliseconds;

      if (domainOlderThanThreeDays) {
        if (dnsResult.success) {
          domainStatus = 'active';
        } else {
          domainStatus = 'disabled';
          domainSendingMode = 'disabled';
          domainReceivingMode = 'disabled';
        }
      }

      if (domainStatus !== 'disabled') {
        const validSendingRecords =
          dnsResult.errors.filter((r) => r.record !== 'MX').length === 0;
        const validReceivingRecords =
          dnsResult.errors.filter((r) => r.record === 'MX').length === 0;

        const anyValidRecords =
          dnsResult.errors.filter((r) =>
            ['SPF', 'MX', 'RETURN_PATH', 'DKIM'].includes(r.record)
          ).length > 3;

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

        if (anyValidRecords && domainStatus === 'pending') {
          domainStatus = 'active';
        }

        await db
          .update(domains)
          .set({
            mxDnsValid:
              dnsResult.errors.filter((r) => r.record === 'MX').length === 0,
            dkimDnsValid:
              dnsResult.errors.filter((r) => r.record === 'DKIM').length === 0,
            spfDnsValid:
              dnsResult.errors.filter((r) => r.record === 'SPF').length === 0,
            returnPathDnsValid:
              dnsResult.errors.filter((r) => r.record === 'RETURN_PATH')
                .length === 0,
            receivingMode: domainReceivingMode,
            sendingMode: domainSendingMode,
            lastDnsCheckAt: new Date(),
            domainStatus: domainStatus
          })
          .where(eq(domains.id, domainResponse.id));
      }

      if (domainStatus === 'disabled') {
        await db
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

      if (domainResponse.postalId) {
        mailBridgeTrpcClient.postal.domains.refreshDomainDns.query({
          postalDomainId: domainResponse.postalId
        });
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

  getOrgDomains: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;

      const domainResponse = await db.query.domains.findMany({
        where: eq(domains.orgId, orgId),
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
