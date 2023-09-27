import dns from 'dns';
interface DnsRecord {
  value: string;
  valid: boolean;
  error: string | null;
}

interface DnsRecords {
  mx: DnsRecord;
  dkim: DnsRecord & { key: string };
  spf: DnsRecord & { otherSenders: string[] };
  returnPath: DnsRecord & { destination: string };
}
export async function verifyDns({
  domainName,
  postalUrl,
  postalRootUrl,
  dkimKey,
  dkimValue
}: {
  domainName: string;
  postalUrl: string;
  postalRootUrl: string;
  dkimKey: string;
  dkimValue: string;
}): Promise<DnsRecords> {
  const dnsRecords: DnsRecords = {
    mx: {
      value: `mx.${postalUrl}`,
      valid: false,
      error: null
    },
    dkim: {
      key: dkimKey,
      value: dkimValue,
      valid: false,
      error: null
    },
    spf: {
      value: '',
      otherSenders: [],
      valid: false,
      error: null
    },
    returnPath: {
      value: `psrp.${domainName}`,
      destination: `rp.${postalUrl}`,
      valid: false,
      error: null
    }
  };

  const domainDnsServers = await dns.promises.resolveNs(domainName);

  const domainDnsServerIpAddresses = (
    await Promise.all(
      domainDnsServers.map((dnsServer) => dns.promises.resolve4(dnsServer))
    )
  ).flat();

  await dns.promises.setServers(domainDnsServerIpAddresses);

  // verify the MX Record
  await dns.promises
    .resolveMx(domainName)
    .then((mxDnsResponse) => {
      if (mxDnsResponse.length > 1) {
        dnsRecords.mx.valid = false;
        dnsRecords.mx.error = 'Multiple MX records found';
        return;
      }
      if (mxDnsResponse[0].exchange !== dnsRecords.mx.value) {
        dnsRecords.mx.valid = false;
        dnsRecords.mx.error = 'MX record does not match';
        return;
      }
      if (mxDnsResponse[0].priority !== 1) {
        dnsRecords.mx.valid = false;
        dnsRecords.mx.error = 'MX record priority is not 1';
        return;
      }
      dnsRecords.mx.valid = true;
      return;
    })
    .catch((error) => {
      dnsRecords.mx.valid = false;
      dnsRecords.mx.error = 'No MX records found';
    });

  // verify the DKIM Record
  await dns.promises
    .resolveTxt(`${dkimKey}.${domainName}`)
    .then((dkimDnsResponse) => {
      if (dkimDnsResponse.length > 1) {
        dnsRecords.dkim.valid = false;
        dnsRecords.dkim.error = 'Multiple DKIM records found';
        return;
      }
      if (dkimDnsResponse[0][0] !== dkimValue) {
        dnsRecords.dkim.valid = false;
        dnsRecords.dkim.error = 'DKIM record value does not match';
        return;
      }
      dnsRecords.dkim.valid = true;
      return;
    })
    .catch((error) => {
      dnsRecords.dkim.valid = false;
      dnsRecords.dkim.error = 'No DKIM records found for that domain key';
    });

  // verify the SPF Record
  await dns.promises
    .resolveTxt(`${domainName}`)
    .then((spfDnsResponse) => {
      const spfRecord = spfDnsResponse
        .flat()
        .find((record) => record.startsWith('v=spf1'));

      if (!spfRecord) {
        dnsRecords.spf.valid = false;
        dnsRecords.spf.value = `v=spf1 mx include:_spf.${postalRootUrl} ~all`;
        dnsRecords.spf.error = 'No SPF record found';
        return;
      }

      // Extract all included domains
      const includedDomains = spfRecord
        .split(' ')
        .filter((part) => part.startsWith('include:'))
        .map((part) => part.replace('include:', ''));

      const recordExists = includedDomains.includes(`_spf.${postalRootUrl}`);
      if (!recordExists) {
        const existingRecordString = includedDomains
          .map((domain) => `include:${domain}`)
          .join(' ');
        const newRecordString = `v=spf1 mx include:_spf.${postalRootUrl} ${existingRecordString} ~all`;
        dnsRecords.spf.valid = false;
        dnsRecords.spf.value = newRecordString;
        dnsRecords.spf.error =
          'SPF record found, but does not include the UnInbox mail server domain';
        return;
      }

      const otherIncludedSenders = includedDomains.filter(
        (domain) => domain !== `_spf.${postalRootUrl}`
      );
      const existingRecordString = otherIncludedSenders
        .map((domain) => `include:${domain}`)
        .join(' ');
      const newRecordString = `v=spf1 mx include:_spf.${postalRootUrl} ${existingRecordString} ~all`;

      dnsRecords.spf.otherSenders = otherIncludedSenders;
      dnsRecords.spf.value = newRecordString;
      dnsRecords.spf.valid = true;

      return;
    })
    .catch((error) => {
      dnsRecords.spf.value = `v=spf1 mx include:_spf.${postalRootUrl} ~all`;
      dnsRecords.spf.valid = false;
      dnsRecords.spf.error = 'Error resolving SPF record';
    });

  // verify the Return-Path Record
  await dns.promises
    .resolveCname(dnsRecords.returnPath.value)
    .then((returnPathDnsResponse) => {
      if (returnPathDnsResponse.length > 1) {
        dnsRecords.returnPath.valid = false;
        dnsRecords.returnPath.error = 'Multiple Return-Path records found';
        return;
      }
      if (returnPathDnsResponse[0] !== `rp.${postalUrl}`) {
        dnsRecords.returnPath.valid = false;
        dnsRecords.returnPath.error = 'Return-Path record does not match';
        return;
      }
      dnsRecords.returnPath.valid = true;
      return;
    })
    .catch((error) => {
      dnsRecords.returnPath.valid = false;
      dnsRecords.returnPath.error = 'No Return-Path records found';
    });

  await dns.promises.setServers(['1.1.1.1', '1.0.0.1']);

  return dnsRecords;
}
