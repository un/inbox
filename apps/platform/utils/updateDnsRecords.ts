import { domains, orgMembers } from '@u22n/database/schema';
import { mailBridgeTrpcClient } from './tRPCServerClients';
import type { TypeId } from '@u22n/utils/typeid';
import { and, eq } from '@u22n/database/orm';
import type { DBType } from '@u22n/database';
import { TRPCError } from '@trpc/server';
import { realtime } from './realtime';
import { ms } from '@u22n/utils/ms';

export async function updateDnsRecords(
  {
    domainPublicId,
    orgId
  }: {
    domainPublicId: TypeId<'domains'>;
    orgId: number;
  },
  db: DBType
) {
  const domainResponse = await db.query.domains.findFirst({
    where: and(eq(domains.publicId, domainPublicId), eq(domains.orgId, orgId)),
    columns: {
      id: true,
      domain: true,
      disabled: true,
      dkimKey: true,
      dkimValue: true,
      postalHost: true,
      postalId: true,
      lastDnsCheckAt: true,
      sendingMode: true,
      receivingMode: true,
      domainStatus: true,
      forwardingAddress: true,
      createdAt: true,
      verifiedAt: true,
      verificationToken: true
    }
  });

  if (!domainResponse) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Domain not found'
    });
  }

  if (domainResponse.disabled) {
    // if domain is manually disabled, update the DNS status if needed
    if (
      ![
        domainResponse.domainStatus,
        domainResponse.sendingMode,
        domainResponse.receivingMode
      ].every((_) => _ === 'disabled')
    ) {
      await db
        .update(domains)
        .set({
          receivingMode: 'disabled',
          sendingMode: 'disabled',
          domainStatus: 'disabled'
        })
        .where(eq(domains.id, domainResponse.id));
    }

    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Domain is disabled'
    });
  }

  if (
    !domainResponse.dkimKey ||
    !domainResponse.dkimValue ||
    !domainResponse.postalId
  ) {
    throw new TRPCError({
      code: 'UNPROCESSABLE_CONTENT',
      message: 'Domain is not setup properly. Contact support for help'
    });
  }

  let {
    domainStatus,
    sendingMode: domainSendingMode,
    receivingMode: domainReceivingMode,
    verifiedAt
  } = domainResponse;

  const currentDNSRecords =
    await mailBridgeTrpcClient.postal.domains.refreshDomainDns.query({
      postalDomainId: domainResponse.postalId,
      postalServerUrl: domainResponse.postalHost
    });

  if ('error' in currentDNSRecords) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: currentDNSRecords.error
    });
  }

  const dnsStatus = {
    mxDnsValid: currentDNSRecords.mx.valid,
    dkimDnsValid: currentDNSRecords.dkim.valid,
    spfDnsValid: currentDNSRecords.spf.valid,
    returnPathDnsValid: currentDNSRecords.returnPath.valid,
    verification: currentDNSRecords.verification.valid,
    dmarcPolicy: currentDNSRecords.dmarc.policy
  };

  // check if domain is verified
  if (currentDNSRecords.verification.valid) {
    // if domain is verified, update the status and verifiedAt
    if (domainStatus === 'unverified') domainStatus = 'pending';
    verifiedAt = new Date();
  } else {
    // if domain is not verified, check if it was verified before
    if (verifiedAt) {
      // if verifiedAt is older than 7 days, set the domain to disabled
      if (Date.now() - verifiedAt.getTime() > ms('7 days')) {
        await db
          .update(domains)
          .set({
            domainStatus: 'disabled',
            receivingMode: 'disabled',
            sendingMode: 'disabled',
            lastDnsCheckAt: new Date(),
            disabledAt: new Date()
          })
          .where(eq(domains.id, domainResponse.id));
        return {
          error: 'Your Domain has been Disabled due to Incorrect verification',
          dnsRecords: currentDNSRecords
        };
        // if verifiedAt is newer than 7 days, set the domain to unverified
      } else {
        domainStatus = 'unverified';
      }
      // if domain was never verified, check if 3 days have passed since creation
    } else {
      // if domain is older than 3 days, set the domain to disabled
      if (Date.now() - domainResponse.createdAt.getTime() > ms('3 days')) {
        await db
          .update(domains)
          .set({
            domainStatus: 'disabled',
            receivingMode: 'disabled',
            sendingMode: 'disabled',
            lastDnsCheckAt: new Date(),
            disabledAt: new Date()
          })
          .where(eq(domains.id, domainResponse.id));

        return {
          error: 'Your Domain has been Disabled',
          dnsRecords: currentDNSRecords
        };
        // if domain is newer than 3 days, set the domain to unverified
      } else {
        await db
          .update(domains)
          .set({
            lastDnsCheckAt: new Date(),
            domainStatus: 'unverified'
          })
          .where(eq(domains.id, domainResponse.id));
        return {
          error: 'Your Domain is not verified',
          dnsRecords: currentDNSRecords
        };
      }
    }
  }

  // Check if Sending mode is valid
  const sendingModeValid =
    dnsStatus.spfDnsValid &&
    dnsStatus.dkimDnsValid &&
    dnsStatus.returnPathDnsValid;

  domainSendingMode = sendingModeValid ? 'native' : 'disabled';

  // Check if Receiving mode is valid
  const receivingModeValid = dnsStatus.mxDnsValid;

  if (receivingModeValid) {
    domainReceivingMode = 'native';
  } else if (domainReceivingMode !== 'disabled') {
    domainReceivingMode = 'forwarding';
  } else {
    domainReceivingMode = 'disabled';
  }

  // if either of the modes are valid, set the domain to active if it is pending
  if (domainStatus === 'pending' && (sendingModeValid || receivingModeValid)) {
    domainStatus = 'active';
  }

  await db
    .update(domains)
    .set({
      mxDnsValid: dnsStatus.mxDnsValid,
      dkimDnsValid: dnsStatus.dkimDnsValid,
      spfDnsValid: dnsStatus.spfDnsValid,
      returnPathDnsValid: dnsStatus.returnPathDnsValid,
      receivingMode: domainReceivingMode,
      sendingMode: domainSendingMode,
      lastDnsCheckAt: new Date(),
      domainStatus,
      verifiedAt
    })
    .where(eq(domains.id, domainResponse.id));

  // If any record is not valid, send an alert to the admins
  if (domainStatus !== 'active' || sendingModeValid || receivingModeValid) {
    const orgAdmins = await db.query.orgMembers.findMany({
      where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, 'admin')),
      columns: {
        publicId: true
      }
    });
    await realtime.emit({
      event: 'admin:issue:refresh',
      data: null,
      orgMemberPublicIds: orgAdmins.map((_) => _.publicId)
    });
  }

  return {
    dnsStatus: dnsStatus,
    dnsRecords: currentDNSRecords,
    domainStatus: domainStatus,
    domainSendingMode: domainSendingMode,
    domainReceivingMode: domainReceivingMode,
    forwardingAddress: domainResponse.forwardingAddress,
    checked: new Date()
  };
}
