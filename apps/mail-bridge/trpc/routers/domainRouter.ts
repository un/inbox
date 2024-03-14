import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../trpc';
import { and, eq } from '@u22n/database/orm';
import {
  postalServers,
  orgPostalConfigs,
  domains
} from '@u22n/database/schema';
import { nanoId, nanoIdLength, zodSchemas } from '@u22n/utils';
import { postalPuppet } from '@u22n/postal-puppet';
import { PostalConfig } from '../../types';

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

      const localMode = config.localMode;
      if (localMode) {
        return {
          orgId: orgId,
          postalServerUrl: 'localmode',
          postalOrgId: postalOrgId,
          domainId: nanoId(),
          dkimKey: 'localmode dkimKey',
          dkimValue: 'localmode dkimValue',
          forwardingAddress: 'forwardingAddress@localmode.local'
        };
      }

      const { puppetInstance } = await postalPuppet.initPuppet({
        postalControlPanel: postalConfig.activeServers.controlPanelSubDomain,
        postalUrl: postalConfig.activeServers.url,
        postalUser: postalConfig.activeServers.cpUsername,
        postalPass: postalConfig.activeServers.cpPassword
      });

      const puppetDomainResponse = await postalPuppet.addDomain({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: postalOrgId,
        domainName: domainName
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
        await postalPuppet.closePuppet(puppetInstance);
        return {
          error: 'No email server found'
        };
      }
      const setMailServerRouteResult =
        await postalPuppet.setMailServerRouteForDomain({
          puppetInstance: puppetInstance,
          orgId: orgId,
          orgPublicId: postalOrgId,
          serverId: postalServerIdResponse.publicId,
          domainName: domainName,
          username: '*'
        });

      await postalPuppet.closePuppet(puppetInstance);

      return {
        orgId: orgId,
        postalServerUrl: postalConfig.activeServers.url as string,
        postalOrgId: postalOrgId,
        domainId: puppetDomainResponse.domainId,
        dkimKey: puppetDomainResponse.dkimKey,
        dkimValue: puppetDomainResponse.dkimValue,
        forwardingAddress: setMailServerRouteResult.forwardingAddress
      };
    }),
  refreshDomainDns: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        orgPublicId: zodSchemas.nanoId,
        postalDomainId: z.string().min(3).max(255)
      })
    )
    .query(async ({ ctx, input }) => {
      const { config, db } = ctx;
      const { orgId, orgPublicId, postalDomainId } = input;
      const postalOrgId = orgPublicId;

      const localMode = config.localMode;
      if (localMode) {
        return {
          success: true
        };
      }

      const postalConfig: PostalConfig = config.postal;

      const { puppetInstance } = await postalPuppet.initPuppet({
        postalControlPanel: postalConfig.activeServers.controlPanelSubDomain,
        postalUrl: postalConfig.activeServers.url,
        postalUser: postalConfig.activeServers.cpUsername,
        postalPass: postalConfig.activeServers.cpPassword
      });

      await postalPuppet.refreshDomainDns({
        puppetInstance: puppetInstance,
        orgId: orgId,
        orgPublicId: postalOrgId,
        domainId: postalDomainId
      });
      await postalPuppet.closePuppet(puppetInstance);

      return;
    })
});
