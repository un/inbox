import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { eq } from '@u22n/database/orm';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils';
import type { PostalConfig } from '../../types';
import {
  addMailServer,
  createOrg,
  setMailServerConfig,
  setMailServerEventWebhook,
  setMailServerKey,
  setMailServerRoutingHttpEndpoint,
  setOrgIpPools
} from '../../postal-db/functions';
import { postalDB } from '../../postal-db';
import { ipPools } from '../../postal-db/schema';

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
      const postalConfig: PostalConfig = config.postal;
      const limits = postalConfig.limits;

      if (postalConfig.localMode === true) {
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
            host: postalConfig.activeServers.url,
            ipPools: postalConfig.activeServers.defaultNewPool,
            defaultIpPool: postalConfig.activeServers.defaultNewPool
          }
        };
      }

      const postalIpPoolQuery = await postalDB.query.ipPools.findFirst({
        where: eq(ipPools.name, postalConfig.activeServers.defaultNewPool),
        columns: {
          id: true
        }
      });

      if (!postalIpPoolQuery || !postalIpPoolQuery.id) {
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
        mailBridgeUrl: postalConfig.webhookDestinations.messages
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
        mailBridgeUrl: postalConfig.webhookDestinations.messages,
        orgId: internalPostalOrgId,
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
          host: postalConfig.activeServers.url,
          ipPools: postalConfig.activeServers.defaultNewPool,
          defaultIpPool: postalConfig.activeServers.defaultNewPool
        }
      };
    })
});
