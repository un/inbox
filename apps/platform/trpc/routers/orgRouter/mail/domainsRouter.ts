import {
  domains,
  postalServers,
  orgPostalConfigs
} from '@u22n/database/schema';
import { router, orgProcedure, orgAdminProcedure } from '~platform/trpc/trpc';
import { mailBridgeTrpcClient } from '~platform/utils/tRPCServerClients';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { updateDnsRecords } from '~platform/utils/updateDnsRecords';
import { iCanHazCallerFactory } from '../iCanHaz/iCanHazRouter';
import { and, eq } from '@u22n/database/orm';
import { lookupNS } from '@u22n/utils/dns';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const domainsRouter = router({
  createNewDomain: orgAdminProcedure
    .input(
      z.object({
        domainName: z.string().min(3).max(255)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;
      const orgPublicId = org.publicId;

      const iCanHazCaller = iCanHazCallerFactory(ctx);

      const canHazDomain = await iCanHazCaller.domain({
        orgShortcode: input.orgShortcode
      });
      if (!canHazDomain) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot add a domain on your current plan'
        });
      }

      const newPublicId = typeIdGenerator('domains');
      const domainName = input.domainName.toLowerCase();

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

      const existingDomain = await db.query.domains.findFirst({
        where: eq(domains.domain, domainName),
        columns: {
          id: true,
          disabled: true,
          domainStatus: true,
          orgId: true
        }
      });

      if (existingDomain) {
        if (existingDomain.orgId === orgId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Your organization already owns this domain'
          });
        }

        // if domain is disabled, any other org can use it, so the DNS checks are used for active domains only
        if (!existingDomain.disabled) {
          if (
            existingDomain.domainStatus === 'active' ||
            existingDomain.domainStatus === 'pending'
          ) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Domain already in use'
            });
          }
        }
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

        if (
          !createMailBridgeOrgResponse?.postalServer ||
          !createMailBridgeOrgResponse.config
        ) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Error while creating the postal server, contact support'
          });
        }

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
        postalHost: mailBridgeResponse.postalServerUrl ?? '',
        dkimKey: mailBridgeResponse.dkimKey,
        dkimValue: mailBridgeResponse.dkimValue,
        verificationToken: mailBridgeResponse.verificationToken,
        postalId: mailBridgeResponse.domainId,
        forwardingAddress: mailBridgeResponse.forwardingAddress,
        receivingMode: 'disabled',
        sendingMode: 'disabled',
        domainStatus: 'unverified'
      });

      return {
        domainId: newPublicId
      };
    }),

  getDomain: orgAdminProcedure
    .input(
      z.object({
        domainPublicId: typeIdValidator('domains')
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const orgId = org.id;
      const { domainPublicId } = input;

      // Handle when adding database replicas
      const dbReplica = db;

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
          domainStatus: true,
          verificationToken: true
        }
      });

      return {
        domainData: domainResponse
      };
    }),

  getDomainDns: orgAdminProcedure
    .input(
      z.object({
        domainPublicId: typeIdValidator('domains')
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;
      const { domainPublicId } = input;

      return updateDnsRecords({ domainPublicId, orgId }, db);
    }),

  getOrgDomains: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;
    const orgId = org.id;

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
