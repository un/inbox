import {
  createDomain,
  setMailServerRouteForDomain,
  getDomainDNSRecords,
  type GetDomainDNSRecordsOutput
} from '../../postal-db/functions';
import { httpEndpoints, organizations, servers } from '../../postal-db/schema';
import { postalServers } from '@u22n/database/schema';
import { typeIdValidator } from '@u22n/utils/typeid';
import { router, protectedProcedure } from '../trpc';
import { activePostalServer } from '../../env';
import { and, eq } from '@u22n/database/orm';
import { postalDB } from '../../postal-db';
import { z } from 'zod';

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

      const localMode = config.MAILBRIDGE_LOCAL_MODE;

      if (localMode) {
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

      const postalServerIdResponse = await db.query.postalServers.findFirst({
        where: and(
          eq(postalServers.orgId, orgId),
          eq(postalServers.type, 'email')
        ),
        columns: {
          id: true,
          orgId: true,
          publicId: true
        }
      });

      if (!postalDbOrgQuery?.id) {
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

      if (!postalServerQuery?.id) {
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

      if (!postalServerEndpointQuery?.id) {
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
        postalServerUrl: activePostalServer.url,
        postalOrgId: postalOrgId,
        domainId: domainId,
        dkimKey: dkimSelector,
        dkimValue: dkimPublicKey,
        verificationToken: verificationToken,
        forwardingAddress: `${token}@${activePostalServer.routesDomain}`
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

      const localMode = config.MAILBRIDGE_LOCAL_MODE;
      if (localMode) {
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
          },
          dmarc: {
            policy: 'quarantine',
            name: 'localhost',
            acceptable: 'v=DMARC1; p=quarantine;',
            optimal: 'v=DMARC1; p=reject;'
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
