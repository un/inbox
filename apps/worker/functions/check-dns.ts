import type { TypeId } from '@u22n/utils/typeid';
import { domains } from '@u22n/database/schema';
import { discord } from '@u22n/utils/discord';
import { dnsVerifier } from '@u22n/utils/dns';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import { env } from '../env';

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

    // Trigger a DNS check on Platform which will take care of updating the records
    await fetch(`${env.PLATFORM_URL}/services/dns-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: env.WORKER_ACCESS_KEY
      },
      body: JSON.stringify({
        orgId: domainInfo.orgId,
        domainPublicId: domainInfo.publicId
      })
    }).then((res) => {
      if (!res.ok) {
        void discord.alert(
          `An error occurred while Communicating with Platform Services for DNS records of Domain ${domainInfo.domain}(${domainInfo.publicId}). The Platform responded with status ${res.status}.`
        );
      }
    });

    await discord.info(
      `Found changes in DNS records for domain ${domainInfo.domain}. Refreshed records. Took ${performance.now() - now}ms.`
    );
  }
}
