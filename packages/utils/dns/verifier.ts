import {
  lookupCNAME,
  lookupMX,
  lookupTXT,
  parseDkim,
  parseDmarc,
  parseSpfIncludes
} from '.';

type DnsVerifierInput = {
  rootDomain: string;
  expected: ExpectedDnsRecords;
};

type ExpectedDnsRecords = {
  verification: {
    value: string | null;
  };
  mx: {
    exchange: string;
    priority: number;
  };
  spf: {
    includes: string;
  };
  dkim: {
    key: string | null;
    value: string | null;
  };
  returnPath: {
    value: string;
  };
};

type DnsVerifierOutput = {
  verification: { valid: boolean; current: string[] | null };
  mx: {
    valid: boolean;
    current: { priority: number; exchange: string }[] | null;
  };
  spf: { valid: boolean; current: { includes: string[]; all: string } | null };
  dkim: { valid: boolean; current: Record<string, string> | null };
  returnPath: { valid: boolean; current: string[] | null };
  dmarc: { valid: boolean; current: Record<string, string> | null };
};

export async function dnsVerifier({ rootDomain, expected }: DnsVerifierInput) {
  const results: DnsVerifierOutput = {
    verification: { valid: false, current: null },
    mx: { valid: false, current: null },
    spf: { valid: false, current: null },
    dkim: { valid: false, current: null },
    returnPath: { valid: false, current: null },
    dmarc: { valid: false, current: null }
  };

  if (expected.verification.value) {
    const verificationRecords = await lookupTXT(
      `_unplatform-challenge.${rootDomain}`
    );
    if (verificationRecords.success) {
      results.verification.valid = verificationRecords.data.includes(
        expected.verification.value
      );
      results.verification.current = verificationRecords.data;
    }
  }

  const spfTxtRecords = await lookupTXT(rootDomain);
  if (spfTxtRecords.success) {
    const spfRecords = parseSpfIncludes(
      spfTxtRecords.data.find((_) => _.startsWith('v=spf1')) ?? ''
    );
    results.spf.valid =
      !!spfRecords && spfRecords.includes.includes(expected.spf.includes);
    results.spf.current = spfRecords;
  }

  if (expected.dkim.key && expected.dkim.value) {
    const dkimRecords = await lookupTXT(
      `unplatform-${expected.dkim.key}._domainkey.${rootDomain}`
    );
    if (dkimRecords.success) {
      const domainKey = parseDkim(
        dkimRecords.data.find((_) => _.startsWith('v=DKIM1')) ?? ''
      );
      results.dkim.valid =
        !!domainKey &&
        domainKey.h === 'sha256' &&
        domainKey.p === expected.dkim.value;
      results.dkim.current = domainKey;
    }
  }

  const mxRecords = await lookupMX(rootDomain);
  if (mxRecords.success) {
    results.mx.valid = mxRecords.data.some(
      (_) =>
        _.exchange === expected.mx.exchange &&
        _.priority === expected.mx.priority
    );
    results.mx.current = mxRecords.data;
  }

  const returnPathRecords = await lookupCNAME(`unrp.${rootDomain}`);
  if (returnPathRecords.success) {
    results.returnPath.valid = returnPathRecords.data.includes(
      expected.returnPath.value
    );
    results.returnPath.current = returnPathRecords.data;
  }

  const dmarcRecords = await lookupTXT(`_dmarc.${rootDomain}`);
  if (dmarcRecords.success) {
    const dmarcValues = parseDmarc(
      dmarcRecords.data.find((_) => _.startsWith('v=DMARC1')) ?? ''
    );
    results.dmarc.valid = !!dmarcValues && dmarcValues.p !== 'none';
    results.dmarc.current = dmarcValues;
  }

  return results;
}
