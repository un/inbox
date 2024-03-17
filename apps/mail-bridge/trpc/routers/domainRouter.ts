import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { and, eq } from '@u22n/database/orm';
import { postalServers } from '@u22n/database/schema';
import { zodSchemas } from '@u22n/utils';
import { PostalConfig } from '../../types';
import { postalDB } from '../../postal-db';
import { httpEndpoints, organizations, servers } from '../../postal-db/schema';
import {
  createDomain,
  setMailServerRouteForDomain,
  verifyDomainDNSRecords
} from '../../postal-db/functions';

export const domainRouter = router({
  createDomain: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        orgPublicId: zodSchemas.nanoId,
        domainName: z.string().min(3).max(255)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config, db } = ctx;
      const { orgId, orgPublicId, domainName } = input;
      const postalOrgId = orgPublicId;

      const postalConfig: PostalConfig = config.postal;

      if (postalConfig.localMode === true) {
        return {
          orgId: orgId,
          postalServerUrl: 'localmode',
          postalOrgId: postalOrgId,
          domainId: crypto.randomUUID(),
          dkimKey: 'localmode dkimKey',
          dkimValue: 'localmode dkimValue',
          forwardingAddress: 'forwardingAddress@localmode.local'
        };
      }

      const { id: internalPostalOrgId } =
        await postalDB.query.organizations.findFirst({
          where: eq(organizations.name, postalOrgId),
          columns: {
            id: true
          }
        });

      if (!internalPostalOrgId) {
        return {
          error: 'Organization not found'
        };
      }

      const { domainId, dkimPublicKey, dkimSelector } = await createDomain({
        domain: domainName,
        orgId: internalPostalOrgId
      });

      const postalServerIdResponse = await db.query.postalServers.findFirst({
        where: and(
          eq(postalServers.orgId, orgId),
          eq(postalServers.type, 'email')
        ),
        columns: {
          publicId: true
        }
      });

      if (!postalServerIdResponse) {
        return {
          error: 'No email server found'
        };
      }

      const { id: internalPostalServerId } =
        await postalDB.query.servers.findFirst({
          where: eq(servers.name, postalOrgId),
          columns: {
            id: true
          }
        });

      const { id: endpointId } = await postalDB.query.httpEndpoints.findFirst({
        where: eq(
          httpEndpoints.name,
          `uninbox-mail-bridge-http-${postalOrgId}`
        ),
        columns: {
          id: true
        }
      });

      const { token } = await setMailServerRouteForDomain({
        username: '*',
        domainId: domainId,
        endpointId: endpointId,
        orgId: internalPostalOrgId,
        serverId: internalPostalServerId
      });

      return {
        orgId: orgId,
        postalServerUrl: postalConfig.activeServers.url as string,
        postalOrgId: postalOrgId,
        domainId: domainId,
        dkimKey: dkimSelector,
        dkimValue: dkimPublicKey,
        forwardingAddress: `${token}@${postalConfig.activeServers.routesDomain}`
      };
    }),
  refreshDomainDns: protectedProcedure
    .input(
      z.object({
        postalDomainId: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const { config } = ctx;
      const { postalDomainId } = input;

      const postalConfig: PostalConfig = config.postal;
      if (postalConfig.localMode === true) {
        return {
          success: true,
          errors: []
        };
      }

      const errors = await verifyDomainDNSRecords(postalDomainId, true);
      return {
        success: errors.length === 0,
        errors
      };
    })
});
