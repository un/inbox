import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  emailIdentities,
  emailRoutingRules,
  emailIdentitiesAuthorizedUsers,
  postalServers
} from '@uninbox/database/schema';
import { nanoid, nanoidLength } from '@uninbox/utils';
import { postalPuppet } from '@uninbox/postal-puppet';
import { eq } from '@uninbox/database/orm';

export const emailRoutesRouter = router({
  createRootEmailAddress: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(32),
        sendName: z.string().max(64),
        userId: z.number().min(1),
        orgId: z.number().min(1),
        serverPublicId: z.string().min(1).max(nanoidLength),
        rootDomainName: z.string().min(1).max(255)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config, db } = ctx;
      const {
        username,
        orgId,
        userId,
        serverPublicId,
        rootDomainName,
        sendName
      } = input;
      const postalPersonalServerOrg = config.postalPersonalServerOrg;
      const userRootEmailAddress = `${username}@${rootDomainName}`;

      const { puppetInstance } = await postalPuppet.initPuppet({
        postalControlPanel: config.postalControlPanel,
        postalUrl: config.postalUrl,
        postalUser: config.postalUser,
        postalPass: config.postalPass
      });

      const setMailServerRouteResult =
        await postalPuppet.setMailServerRouteForDomain({
          puppetInstance: puppetInstance,
          orgId: orgId,
          orgPublicId: postalPersonalServerOrg,
          serverId: serverPublicId,
          domainName: rootDomainName,
          username: username
        });

      await postalPuppet.closePuppet(puppetInstance);

      const newroutingRulePublicId = nanoid();
      const routingRuleInsertResponse = await db
        .insert(emailRoutingRules)
        .values({
          publicId: newroutingRulePublicId,
          orgId: orgId,
          name: `Delivery of emails to ${userRootEmailAddress}`,
          description: 'This route helps deliver your @uninbox emails to you'
        });

      const newEmailIdentityPublicId = nanoid();
      const insertEmailIdentityResponse = await db
        .insert(emailIdentities)
        .values({
          publicId: newEmailIdentityPublicId,
          orgId: orgId,
          username: username,
          domainName: rootDomainName,
          routingRuleId: +routingRuleInsertResponse.insertId,
          sendName: sendName,
          isCatchAll: false
        });

      await db.insert(emailIdentitiesAuthorizedUsers).values({
        identityId: +insertEmailIdentityResponse.insertId,
        userId: userId,
        addedBy: userId
      });

      await db
        .update(postalServers)
        .set({
          forwardingAddress: setMailServerRouteResult.forwardingAddress
        })
        .where(eq(postalServers.publicId, serverPublicId));

      return {
        success: true,
        userId: userId,
        emailIdentity: userRootEmailAddress
      };
    })
});
