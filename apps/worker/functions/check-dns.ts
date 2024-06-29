import { db } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { domains } from '@u22n/database/schema';
import { dnsVerifier } from '@u22n/utils/dns';
import type { TypeId } from '@u22n/utils/typeid';
import { mailBridgeTrpcClient } from '../utils/trpc-server-clients';
import { discord } from '@u22n/utils/discord';

export async function checkDns(publicId: TypeId<'domains'>) {
  const now = performance.now();
  const domainInfo = await db.query.domains.findFirst({
    where: eq(domains.publicId, publicId)
  });

  if (!domainInfo) {
    throw new Error('Domain not found');
  }

  const dnsResults = await dnsVerifier({
    rootDomain: domainInfo.domain,
    expected: {
      verification: {
        value: domainInfo.verificationToken
      },
      spf: {
        includes: `_spf.${domainInfo.postalHost}`
      },
      dkim: {
        key: domainInfo.dkimKey,
        value: domainInfo.dkimValue
      },
      mx: {
        exchange: `mx.${domainInfo.postalHost}`,
        priority: 1
      },
      returnPath: {
        value: `rp.${domainInfo.postalHost}`
      }
    }
  });

  const hasRecordsChanged =
    !!domainInfo.verifiedAt !== dnsResults.verification.valid ||
    domainInfo.spfDnsValid !== dnsResults.spf.valid ||
    domainInfo.dkimDnsValid !== dnsResults.dkim.valid ||
    domainInfo.mxDnsValid !== dnsResults.mx.valid ||
    domainInfo.returnPathDnsValid !== dnsResults.returnPath.valid;

  if (hasRecordsChanged) {
    if (!domainInfo.postalId) {
      await discord.alert(
        `An error occurred while checking DNS records for domain ${domainInfo.domain}. The domain does not have a postalId.`
      );
      return;
    }

    await mailBridgeTrpcClient.postal.domains.refreshDomainDns.query({
      postalDomainId: domainInfo.postalId,
      postalServerUrl: domainInfo.postalHost
    });

    await discord.info(
      `Found changes in DNS records for domain ${domainInfo.domain}. Refreshed records. Took ${performance.now() - now}ms.`
    );
  }
}
