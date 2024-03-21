import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { and, eq } from '@u22n/database/orm';
import { postalServers } from '@u22n/database/schema';
import { typeIdValidator } from '@u22n/utils';
import type { PostalConfig } from '../../types';
import { postalDB } from '../../postal-db';
import { httpEndpoints, organizations, servers } from '../../postal-db/schema';
import {
  createDomain,
  setMailServerRouteForDomain,
  getDomainDNSRecords,
  type GetDomainDNSRecordsOutput
} from '../../postal-db/functions';

export const domainRouter = router({
  createDomain: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        orgPublicId: typeIdValidator('org'),
        domainName: z.string().min(3).max(255)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config, db } = ctx;
      const { orgId, orgPublicId, domainName } = input;
      const postalOrgId = orgPublicId;

      const postalConfig = config.postal as PostalConfig;

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

      const postalDbOrgQuery = await postalDB.query.organizations.findFirst({
        where: eq(organizations.name, postalOrgId),
        columns: {
          id: true
        }
      });

      if (!postalDbOrgQuery || !postalDbOrgQuery.id) {
        return {
          error: 'Organization not found'
        };
      }
      const internalPostalOrgId = postalDbOrgQuery.id;

      const { domainId, dkimPublicKey, dkimSelector, verificationToken } =
        await createDomain({
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

      const postalServerQuery = await postalDB.query.servers.findFirst({
        where: eq(servers.name, postalServerIdResponse.publicId),
        columns: {
          id: true
        }
      });

      if (!postalServerQuery || !postalServerQuery.id) {
        return {
          error: 'Server not found'
        };
      }

      const internalPostalServerId = postalServerQuery.id;

      const postalServerEndpointQuery =
        await postalDB.query.httpEndpoints.findFirst({
          where: eq(
            httpEndpoints.name,
            `uninbox-mail-bridge-http-${postalServerIdResponse.publicId}`
          ),
          columns: {
            id: true
          }
        });

      if (!postalServerEndpointQuery || !postalServerEndpointQuery.id) {
        return {
          error: 'Endpoint not found'
        };
      }

      const endpointId = postalServerEndpointQuery.id;
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
        verificationToken: verificationToken,
        forwardingAddress: `${token}@${postalConfig.activeServers.routesDomain}`
      };
    }),
  refreshDomainDns: protectedProcedure
    .input(
      z.object({
        postalDomainId: z.string(),
        postalServerUrl: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const { config } = ctx;
      const { postalDomainId, postalServerUrl } = input;

      const postalConfig = config.postal as PostalConfig;
      if (postalConfig.localMode === true) {
        return {
          verification: {
            valid: true,
            name: 'localhost',
            value: 'uninbox-verification local'
          },
          dkim: {
            valid: true,
            name: 'localhost',
            value: ''
          },
          spf: {
            valid: true,
            name: 'localhost',
            value: '',
            extraSenders: false
          },
          mx: {
            valid: true,
            name: 'localhost',
            priority: 10,
            value: 'mx.localhost'
          },
          returnPath: {
            valid: true,
            name: 'localhost',
            value: 'rp.localhost'
          }
        } satisfies GetDomainDNSRecordsOutput;
      }

      const records = await getDomainDNSRecords(
        postalDomainId,
        postalServerUrl,
        true
      );
      return records;
    })
});
