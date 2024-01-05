import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  emailIdentities,
  emailRoutingRules,
  emailIdentitiesAuthorizedUsers,
  postalServers,
  personalEmailIdentities
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
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
        serverPublicId: z.string().min(1).max(nanoIdLength),
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
      const localMode = config.localMode;
      if (localMode) {
        return {
          success: true,
          userId: userId,
          emailIdentity: userRootEmailAddress
        };
      }

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

      return {
        success: true,
        orgId: orgId,
        userId: userId,
        emailIdentity: userRootEmailAddress,
        domainName: setMailServerRouteResult.domainName,
        forwardingAddress: setMailServerRouteResult.forwardingAddress
      };
    })
});
