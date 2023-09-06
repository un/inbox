import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../trpc';
import { eq } from '@uninbox/database/orm';
import { postalServers, orgPostalConfigs } from '@uninbox/database/schema';
import { nanoid, nanoidLength } from '@uninbox/utils';
import { postalPuppet } from '@uninbox/postal-puppet';

export const postalPuppetRouter = router({
  createOrg: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        orgPublicId: z.string().min(3).max(nanoidLength)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config, db } = ctx;
      const { orgId, orgPublicId } = input;

      const { puppetInstance } = await postalPuppet.initPuppet({
        postalControlPanel: config.postalControlPanel,
        postalUrl: config.postalUrl,
        postalUser: config.postalUser,
        postalPass: config.postalPass
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
        poolId: config.postalDefaultIpPool
      });

      const newServerPublicId = nanoid();

      await postalPuppet.addMailServer({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: orgPublicId,
        serverId: newServerPublicId,
        defaultIpPoolId: config.postalDefaultIpPool
      });

      await postalPuppet.setMailServerConfig({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: orgPublicId,
        serverId: newServerPublicId,
        // New Account limits
        sendLimit: 15,
        messageRetentionDays: 14,
        outboundSpamThreshold: 5,
        rawMessageRetentionDays: 7,
        rawMessageRetentionSize: 512
      });

      await postalPuppet.setMailServerEventWebhooks({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: orgPublicId,
        serverId: newServerPublicId,
        mailBridgeUrl: `${config.postalWebhookUrl}/postal/events/${newServerPublicId}`
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

      await postalPuppet.setMailServerRoutingHttpEndpoint({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: orgPublicId,
        serverId: newServerPublicId,
        mailBridgeUrl: `${config.postalWebhookUrl}/postal/mail/inbound/${newServerPublicId}`
      });

      await postalPuppet.closePuppet(puppetInstance);

      await db.insert(postalServers).values({
        orgId: orgId,
        publicId: newServerPublicId,
        type: 'email',
        apiKey: setMailServerApiKeyResult.apiKey,
        smtpKey: setMailServerSmtpKeyResult.smtpKey,
        sendLimit: 0
      });

      await db.insert(orgPostalConfigs).values({
        orgId: orgId,
        host: config.postalUrl,
        ipPools: config.postalDefaultIpPool,
        defaultIpPool: config.postalDefaultIpPool
      });

      return { success: true };
    })
});
