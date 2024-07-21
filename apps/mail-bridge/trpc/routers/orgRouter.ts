import {
  addMailServer,
  createOrg,
  setMailServerConfig,
  setMailServerEventWebhook,
  setMailServerKey,
  setMailServerRoutingHttpEndpoint,
  setOrgIpPools
} from '../../postal-db/functions';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { router, protectedProcedure } from '../trpc';
import { ipPools } from '../../postal-db/schema';
import { activePostalServer } from '../../env';
import { postalDB } from '../../postal-db';
import { eq } from '@u22n/database/orm';
import { z } from 'zod';

export const orgRouter = router({
  createPostalOrg: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        orgPublicId: typeIdValidator('org')
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config } = ctx;
      const { orgId, orgPublicId } = input;
      const localMode = config.MAILBRIDGE_LOCAL_MODE;
      const limits = config.MAILBRIDGE_POSTAL_SERVER_LIMITS;

      if (localMode) {
        return {
          success: true,
          orgId: orgId,
          postalOrgId: typeIdGenerator('org'),
          postalServer: {
            serverPublicId: typeIdGenerator('postalServers'),
            apiKey: 'localAPIKey',
            smtpKey: 'localSMTPKey'
          },
          config: {
            host: activePostalServer.url,
            ipPools: activePostalServer.defaultNewPool,
            defaultIpPool: activePostalServer.defaultNewPool
          }
        };
      }

      const postalIpPoolQuery = await postalDB.query.ipPools.findFirst({
        where: eq(ipPools.name, activePostalServer.defaultNewPool),
        columns: {
          id: true
        }
      });

      if (!postalIpPoolQuery?.id) {
        return {
          error: 'IP Pool not found'
        };
      }

      const internalPostalPoolId = postalIpPoolQuery.id;

      const { orgId: internalPostalOrgId } = await createOrg({
        orgPublicId,
        ipPoolId: internalPostalPoolId
      });

      await setOrgIpPools({
        orgId: internalPostalOrgId,
        poolIds: [internalPostalPoolId]
      });

      const newServerPublicId = typeIdGenerator('postalServers');

      const { serverId: internalPostalMailserverId } = await addMailServer({
        orgId: internalPostalOrgId,
        serverPublicId: newServerPublicId,
        defaultIpPoolId: internalPostalPoolId
      });

      await setMailServerConfig({
        serverId: internalPostalMailserverId,
        // New Account limits
        messageRetentionDays: limits.messageRetentionDays,
        outboundSpamThreshold: limits.outboundSpamThreshold,
        rawMessageRetentionDays: limits.rawMessageRetentionDays,
        rawMessageRetentionSize: limits.rawMessageRetentionSize
      });

      await setMailServerEventWebhook({
        serverId: internalPostalMailserverId,
        serverPublicId: newServerPublicId,
        mailBridgeUrl: config.MAILBRIDGE_POSTAL_WEBHOOK_DESTINATIONS.messages
      });

      const { key: apiKey } = await setMailServerKey({
        publicOrgId: orgPublicId,
        serverId: internalPostalMailserverId,
        serverPublicId: newServerPublicId,
        type: 'API'
      });

      const { key: smtpKey } = await setMailServerKey({
        publicOrgId: orgPublicId,
        serverId: internalPostalMailserverId,
        serverPublicId: newServerPublicId,
        type: 'SMTP'
      });

      await setMailServerRoutingHttpEndpoint({
        mailBridgeUrl: config.MAILBRIDGE_POSTAL_WEBHOOK_DESTINATIONS.messages,
        orgId: orgId,
        serverId: internalPostalMailserverId,
        serverPublicId: newServerPublicId
      });

      return {
        success: true,
        orgId: orgId,
        postalOrgId: orgPublicId,
        postalServer: {
          serverPublicId: newServerPublicId,
          apiKey: apiKey,
          smtpKey: smtpKey
        },
        config: {
          host: activePostalServer.url,
          ipPools: activePostalServer.defaultNewPool,
          defaultIpPool: activePostalServer.defaultNewPool
        }
      };
    })
});
