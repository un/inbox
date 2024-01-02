import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../trpc';
import { eq } from '@uninbox/database/orm';
import { postalServers, orgPostalConfigs } from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
import { postalPuppet } from '@uninbox/postal-puppet';

export const orgRouter = router({
  createOrg: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        orgPublicId: z.string().min(3).max(nanoIdLength),
        personalOrg: z.boolean().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config, db } = ctx;
      const { orgId, orgPublicId, personalOrg } = input;
      const postalOrgId = personalOrg
        ? config.postalPersonalServerOrg
        : orgPublicId;
      const limits = config.defaultLimits;
      const localMode = config.localMode;
      if (localMode) {
        return {
          success: true,
          orgId: orgId,
          serverPublicId: nanoId(),
          postalOrgId: nanoId()
        };
      }

      const { puppetInstance } = await postalPuppet.initPuppet({
        postalControlPanel: config.postalControlPanel,
        postalUrl: config.postalUrl,
        postalUser: config.postalUser,
        postalPass: config.postalPass
      });

      if (!personalOrg) {
        await postalPuppet.createOrg({
          puppetInstance: puppetInstance,
          orgId: orgId,
          orgPublicId: postalOrgId
        });

        await postalPuppet.setOrgIpPools({
          puppetInstance,
          orgId,
          orgPublicId,
          poolId: config.postalDefaultIpPool
        });
      }

      const newServerPublicId = nanoId();

      await postalPuppet.addMailServer({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: postalOrgId,
        serverId: newServerPublicId,
        defaultIpPoolId: config.postalDefaultIpPool
      });

      await postalPuppet.setMailServerConfig({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: postalOrgId,
        serverId: newServerPublicId,
        // New Account limits
        sendLimit: limits.sendLimit,
        messageRetentionDays: limits.messageRetentionDays,
        outboundSpamThreshold: limits.outboundSpamThreshold,
        rawMessageRetentionDays: limits.rawMessageRetentionDays,
        rawMessageRetentionSize: limits.rawMessageRetentionSize
      });

      await postalPuppet.setMailServerEventWebhooks({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: postalOrgId,
        serverId: newServerPublicId,
        mailBridgeUrl: `${config.postalWebhookUrl}/postal/events/${newServerPublicId}`
      });

      const setMailServerApiKeyResult = await postalPuppet.setMailServerApiKey({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: postalOrgId,
        serverId: newServerPublicId
      });

      const setMailServerSmtpKeyResult = personalOrg
        ? { smtpKey: '' }
        : await postalPuppet.setMailServerSmtpKey({
            puppetInstance: puppetInstance,
            orgId: orgId,
            orgPublicId: postalOrgId,
            serverId: newServerPublicId
          });

      const mailBridgeWebhookUrl = personalOrg
        ? `${config.postalWebhookUrl}/postal/mail/inbound/root-${newServerPublicId}`
        : `${config.postalWebhookUrl}/postal/mail/inbound/${newServerPublicId}`;
      await postalPuppet.setMailServerRoutingHttpEndpoint({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: postalOrgId,
        serverId: newServerPublicId,
        mailBridgeUrl: mailBridgeWebhookUrl
      });

      await postalPuppet.closePuppet(puppetInstance);

      await db.insert(postalServers).values({
        orgId: orgId,
        publicId: newServerPublicId,
        type: 'email',
        apiKey: setMailServerApiKeyResult.apiKey,
        smtpKey: setMailServerSmtpKeyResult.smtpKey,
        sendLimit: limits.sendLimit,
        rootMailServer: personalOrg
      });

      await db.insert(orgPostalConfigs).values({
        orgId: orgId,
        host: config.postalUrl,
        ipPools: config.postalDefaultIpPool,
        defaultIpPool: config.postalDefaultIpPool
      });

      return {
        success: true,
        orgId: orgId,
        serverPublicId: newServerPublicId,
        postalOrgId: postalOrgId
      };
    })
});
