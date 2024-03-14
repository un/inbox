import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { eq } from '@u22n/database/orm';
import { nanoId, zodSchemas } from '@u22n/utils';
import { postalPuppet } from '@u22n/postal-puppet';
import { PostalConfig } from '../../types';

export const orgRouter = router({
  createPostalOrg: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        orgPublicId: zodSchemas.nanoId
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config, db } = ctx;
      const { orgId, orgPublicId } = input;
      const postalConfig: PostalConfig = config.postal;
      const limits = postalConfig.limits;

      if (postalConfig.localMode === true) {
        return {
          success: true,
          orgId: orgId,
          postalOrgId: nanoId(),
          postalServer: {
            serverPublicId: nanoId(),
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

      const { puppetInstance } = await postalPuppet.initPuppet({
        postalControlPanel: postalConfig.activeServers.controlPanelSubDomain,
        postalUrl: postalConfig.activeServers.url,
        postalUser: postalConfig.activeServers.cpUsername,
        postalPass: postalConfig.activeServers.cpPassword
      });

      await postalPuppet.createOrg({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: orgPublicId
      });

      await postalPuppet.setOrgIpPools({
        puppetInstance,
        orgId,
        orgPublicId,
        poolId: postalConfig.activeServers.defaultNewPool
      });

      const newServerPublicId = nanoId();

      await postalPuppet.addMailServer({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: orgPublicId,
        serverId: newServerPublicId,
        defaultIpPoolId: postalConfig.activeServers.defaultNewPool
      });

      await postalPuppet.setMailServerConfig({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: orgPublicId,
        serverId: newServerPublicId,
        // New Account limits
        messageRetentionDays: limits.messageRetentionDays,
        outboundSpamThreshold: limits.outboundSpamThreshold,
        rawMessageRetentionDays: limits.rawMessageRetentionDays,
        rawMessageRetentionSize: limits.rawMessageRetentionSize
      });

      await postalPuppet.setMailServerEventWebhooks({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: orgPublicId,
        serverId: newServerPublicId,
        mailBridgeUrl: `${postalConfig.webhookDestinations.messages}/postal/events/${newServerPublicId}`
      });

      const setMailServerApiKeyResult = await postalPuppet.setMailServerApiKey({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: orgPublicId,
        serverId: newServerPublicId
      });

      const setMailServerSmtpKeyResult =
        await postalPuppet.setMailServerSmtpKey({
          puppetInstance: puppetInstance,
          orgId: orgId,
          orgPublicId: orgPublicId,
          serverId: newServerPublicId
        });

      const mailBridgeWebhookUrl = `${postalConfig.webhookDestinations.messages}/postal/mail/inbound/${newServerPublicId}`;
      await postalPuppet.setMailServerRoutingHttpEndpoint({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: orgPublicId,
        serverId: newServerPublicId,
        mailBridgeUrl: mailBridgeWebhookUrl
      });

      await postalPuppet.closePuppet(puppetInstance);

      return {
        success: true,
        orgId: orgId,
        postalOrgId: orgPublicId,
        postalServer: {
          serverPublicId: newServerPublicId,
          apiKey: setMailServerApiKeyResult.apiKey,
          smtpKey: setMailServerSmtpKeyResult.smtpKey
        },
        config: {
          host: postalConfig.activeServers.url,
          ipPools: postalConfig.activeServers.defaultNewPool,
          defaultIpPool: postalConfig.activeServers.defaultNewPool
        }
      };
    })
});
