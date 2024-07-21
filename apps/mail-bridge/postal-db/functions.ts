import {
  lookupCNAME,
  lookupMX,
  lookupTXT,
  buildDkimRecord,
  buildSpfRecord,
  parseDkim,
  parseSpfIncludes,
  parseDmarc,
  buildDmarcRecord
} from '@u22n/utils/dns';
import {
  organizations,
  domains,
  credentials,
  organizationIpPools,
  servers,
  webhooks,
  httpEndpoints,
  routes
} from './schema';
import {
  generateDKIMKeyPair,
  generatePublicKey,
  getUniqueDKIMSelector,
  randomAlphaNumeric
} from './generators';
import { connection as rawMySqlConnection, postalDB } from '.';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { env } from '../env';

export type CreateOrgInput = {
  orgPublicId: string;
  ipPoolId: number;
};

const dnsRootUrl = env.MAILBRIDGE_POSTAL_SERVERS_DNS_ROOT_URL;

export async function createOrg(input: CreateOrgInput) {
  const [{ insertId }] = await postalDB.insert(organizations).values({
    uuid: randomUUID(),
    name: input.orgPublicId,
    permalink: input.orgPublicId.toLowerCase().replaceAll('_', '-'),
    ipPoolId: input.ipPoolId,
    timeZone: 'UTC',
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
    ownerId: 1 // There should be only one postal user, thus id should be 1
  });
  return {
    orgId: insertId
  };
}

export type CreateDomainInput = {
  orgId: number;
  domain: string;
};

export async function createDomain(input: CreateDomainInput) {
  const { privateKey, publicKey } = await generateDKIMKeyPair();
  const verificationToken = randomAlphaNumeric(32);
  const dkimSelector = await getUniqueDKIMSelector();
  const domainId = randomUUID();

  await postalDB.insert(domains).values({
    uuid: domainId,
    name: input.domain,
    verificationToken,
    verificationMethod: 'DNS',
    ownerType: 'Organization',
    ownerId: input.orgId,
    dkimPrivateKey: privateKey,
    dkimIdentifierString: dkimSelector,
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`
  });
  return {
    dkimSelector,
    dkimPublicKey: publicKey,
    domainId,
    verificationToken
  };
}

export type GetDomainDNSRecordsOutput =
  | {
      verification: {
        valid: boolean;
        name: string;
        value: string;
      };
      mx: {
        valid: boolean;
        priority: number;
        name: string;
        value: string;
      };
      spf: {
        valid: boolean;
        name: string;
        value: string;
        extraSenders: boolean;
      };
      dkim: {
        valid: boolean;
        name: string;
        value: string;
      };
      returnPath: {
        valid: boolean;
        name: string;
        value: string;
      };
      dmarc: {
        policy: 'reject' | 'quarantine' | 'none' | null;
        name: string;
        optimal: string;
        acceptable: string;
      };
    }
  | { error: string };

export async function getDomainDNSRecords(
  domainId: string,
  postalServerUrl: string,
  forceReverify = false
): Promise<GetDomainDNSRecordsOutput> {
  const domainInfo = await postalDB.query.domains.findFirst({
    where: eq(domains.uuid, domainId)
  });

  if (!domainInfo) {
    return { error: 'Domain not found, Contact Support' };
  }

  const records: GetDomainDNSRecordsOutput = {
    verification: {
      valid: false,
      name: '',
      value: ''
    },
    mx: {
      valid: false,
      name: '',
      priority: 0,
      value: ''
    },
    spf: {
      valid: false,
      name: '',
      value: '',
      extraSenders: false
    },
    dkim: {
      valid: false,
      name: '',
      value: ''
    },
    returnPath: {
      valid: false,
      name: '',
      value: ''
    },
    dmarc: {
      policy: null,
      name: '',
      optimal: '',
      acceptable: ''
    }
  };

  const txtRecords = await lookupTXT(domainInfo.name);

  if (txtRecords.success === false && txtRecords.code !== 0) {
    return {
      error: `${txtRecords.error} Please retry after sometime, if the problem persists contact Support`
    };
  }

  const verificationRecordValue = `${domainInfo.verificationToken}`;
  const verificationTxtRecordName = await lookupTXT(
    `_unplatform-challenge.${domainInfo.name}`
  );
  const verified = verificationTxtRecordName.success
    ? verificationTxtRecordName.data.includes(verificationRecordValue)
    : false;

  records.verification = {
    valid: verified,
    name: `_unplatform-challenge`,
    value: verificationRecordValue
  };

  if (!verified || !domainInfo.verifiedAt || forceReverify) {
    await postalDB
      .update(domains)
      .set({
        verifiedAt: verified ? sql`CURRENT_TIMESTAMP` : sql`NULL`
      })
      .where(eq(domains.uuid, domainId));
  }

  const spfDomains = txtRecords.success
    ? parseSpfIncludes(
        txtRecords.data.find((_) => _.startsWith('v=spf1')) ?? ''
      )
    : null;
  records.spf.name = '@';
  records.spf.extraSenders =
    (spfDomains &&
      spfDomains.includes.filter((x) => x !== `_spf.${dnsRootUrl}`).length >
        0) ??
    false;

  // We need to resolve duplicate entries incase the spf record is already included, so that we don't have duplicate entries
  const allSenders = Array.from(
    new Set([
      `_spf.${dnsRootUrl}`,
      ...(records.spf.extraSenders ? spfDomains?.includes ?? [] : [])
    ]).values()
  );

  records.spf.value = buildSpfRecord(allSenders, '~all');
  records.spf.valid =
    spfDomains?.includes.includes(`_spf.${dnsRootUrl}`) ?? false;

  if (!records.spf.valid || domainInfo.spfStatus !== 'OK' || forceReverify) {
    await postalDB
      .update(domains)
      .set(
        !spfDomains
          ? { spfStatus: 'Missing', spfError: 'SPF record not found' }
          : !spfDomains.includes.includes(`_spf.${dnsRootUrl}`)
            ? { spfStatus: 'Invalid', spfError: 'SPF record Invalid' }
            : { spfStatus: 'OK', spfError: null }
      )
      .where(eq(domains.uuid, domainId));
  }

  const publicKey = generatePublicKey(domainInfo.dkimPrivateKey);
  records.dkim.name = `unplatform-${domainInfo.dkimIdentifierString}._domainkey`;
  records.dkim.value = buildDkimRecord({
    t: 's',
    h: 'sha256',
    p: publicKey
  });
  //  We assume these are valid already, if the db says they are not or forceReverify is used, valid gets updated
  records.dkim.valid = true;

  if (domainInfo.dkimStatus !== 'OK' || forceReverify) {
    const domainKeyRecords = await lookupTXT(
      `unplatform-${domainInfo.dkimIdentifierString}._domainkey.${domainInfo.name}`
    );

    if (!domainKeyRecords.success) {
      records.dkim.valid = false;
      await postalDB
        .update(domains)
        .set({ dkimStatus: 'Missing', dkimError: 'DKIM record not found' })
        .where(eq(domains.uuid, domainId));
    } else {
      const domainKey = parseDkim(
        domainKeyRecords.data.find((_) => _.startsWith('v=DKIM1')) ?? ''
      );
      if (!domainKey || domainKey.h !== 'sha256' || domainKey.p !== publicKey) {
        records.dkim.valid = false;
        await postalDB
          .update(domains)
          .set({ dkimStatus: 'Invalid', dkimError: 'DKIM record Invalid' })
          .where(eq(domains.uuid, domainId));
      } else {
        records.dkim.valid = true;
        await postalDB
          .update(domains)
          .set({ dkimStatus: 'OK', dkimError: null })
          .where(eq(domains.uuid, domainId));
      }
    }
  }

  records.returnPath.name = `unrp`;
  records.returnPath.value = `rp.${postalServerUrl}`;
  records.returnPath.valid = true;

  if (domainInfo.returnPathStatus !== 'OK' || forceReverify) {
    const returnPathCname = await lookupCNAME(`unrp.${domainInfo.name}`);
    if (!returnPathCname.success) {
      records.returnPath.valid = false;
      await postalDB
        .update(domains)
        .set({
          returnPathStatus: 'Missing',
          returnPathError: 'Return-Path CNAME record not found'
        })
        .where(eq(domains.uuid, domainId));
    } else if (!returnPathCname.data.includes(records.returnPath.value)) {
      records.returnPath.valid = false;
      await postalDB
        .update(domains)
        .set({
          returnPathStatus: 'Invalid',
          returnPathError: null
        })
        .where(eq(domains.uuid, domainId));
    } else {
      await postalDB
        .update(domains)
        .set({ returnPathStatus: 'OK', returnPathError: null })
        .where(eq(domains.uuid, domainId));
    }
  }
  records.mx.name = domainInfo.name;
  records.mx.priority = 1;
  records.mx.value = `mx.${postalServerUrl}`;
  records.mx.valid = true;

  if (domainInfo.mxStatus !== 'OK' || forceReverify) {
    const mxRecords = await lookupMX(domainInfo.name);
    if (!mxRecords.success) {
      records.mx.valid = false;
      await postalDB
        .update(domains)
        .set({ mxStatus: 'Missing', mxError: 'MX record not found' })
        .where(eq(domains.uuid, domainId));
    } else if (
      mxRecords.data.length > 1 ||
      !mxRecords.data.find(
        (x) => x.exchange === records.mx.value && x.priority === 1
      )
    ) {
      records.mx.valid = false;
      await postalDB
        .update(domains)
        .set({ mxStatus: 'Invalid', mxError: 'MX record Invalid' })
        .where(eq(domains.uuid, domainId));
    } else {
      await postalDB
        .update(domains)
        .set({ mxStatus: 'OK', mxError: null })
        .where(eq(domains.uuid, domainId));
    }
  }

  const dmarcRecord = await lookupTXT(`_dmarc.${domainInfo.name}`);
  if (dmarcRecord.success && dmarcRecord.data.length > 0) {
    const dmarcValues = parseDmarc(
      dmarcRecord.data.find((_) => _.startsWith('v=DMARC1')) ?? ''
    );
    if (dmarcValues) {
      records.dmarc.policy =
        (dmarcValues.p as 'reject' | 'quarantine' | 'none') || null;
    }
  }
  records.dmarc.name = '_dmarc';
  records.dmarc.optimal = buildDmarcRecord({ p: 'reject' });
  records.dmarc.acceptable = buildDmarcRecord({ p: 'quarantine' });
  return records;
}

export type SetMailServerKeyInput = {
  type: 'SMTP' | 'API';
  publicOrgId: string;
  serverId: number;
  serverPublicId: string;
};

export async function setMailServerKey(input: SetMailServerKeyInput) {
  const key = randomAlphaNumeric(24);
  const uuid = randomUUID();

  await postalDB.insert(credentials).values({
    serverId: input.serverId,
    type: input.type,
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
    key,
    uuid,
    hold: 0,
    name: input.serverPublicId + (input.type === 'SMTP' ? '-smtp' : '-api')
  });

  return {
    key
  };
}

export type SetOrgIpPoolsInput = {
  orgId: number;
  poolIds: number[];
};

export async function setOrgIpPools(input: SetOrgIpPoolsInput) {
  const existingPools = await postalDB.query.organizationIpPools.findMany({
    where: eq(organizationIpPools.organizationId, input.orgId)
  });

  const poolsToAdd = input.poolIds.filter(
    (pool) => !existingPools.some((_) => _.ipPoolId === pool)
  );

  const poolsToRemove = existingPools
    .filter((pool) => !input.poolIds.some((_) => _ === pool.ipPoolId))
    .map((_) => _.ipPoolId!);

  for await (const pool of poolsToAdd) {
    await postalDB.insert(organizationIpPools).values({
      organizationId: input.orgId,
      ipPoolId: pool,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`
    });
  }

  for await (const pool of poolsToRemove) {
    await postalDB
      .delete(organizationIpPools)
      .where(
        and(
          eq(organizationIpPools.organizationId, input.orgId),
          eq(organizationIpPools.ipPoolId, pool)
        )
      );
  }
}

export type SetMailServerConfigInput = {
  serverId: number;
  sendLimit?: number;
  outboundSpamThreshold?: number;
  messageRetentionDays?: number;
  rawMessageRetentionDays?: number;
  rawMessageRetentionSize?: number;
};

export async function setMailServerConfig(input: SetMailServerConfigInput) {
  await postalDB
    .update(servers)
    .set({
      sendLimit: input.sendLimit,
      outboundSpamThreshold: input.outboundSpamThreshold?.toString(),
      messageRetentionDays: input.messageRetentionDays,
      rawMessageRetentionDays: input.rawMessageRetentionDays,
      rawMessageRetentionSize: input.rawMessageRetentionSize
    })
    .where(eq(servers.id, input.serverId));
}

export type SetMailServerEventWebhookInput = {
  serverId: number;
  serverPublicId: string;
  mailBridgeUrl: string;
};

export async function setMailServerEventWebhook(
  input: SetMailServerEventWebhookInput
) {
  const webhookUrl = `${input.mailBridgeUrl}/postal/events/${input.serverPublicId}`;
  await postalDB
    .update(webhooks)
    .set({
      url: webhookUrl,
      name: input.serverPublicId,
      serverId: input.serverId,
      uuid: randomUUID(),
      allEvents: 1,
      enabled: 1,
      sign: 1,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`
    })
    .where(eq(webhooks.serverId, input.serverId));
  return { webhookUrl };
}

export type SetMailServerRoutingHttpEndpointInput = {
  orgId: number;
  serverPublicId: string;
  serverId: number;
  mailBridgeUrl: string;
};

export async function setMailServerRoutingHttpEndpoint(
  input: SetMailServerRoutingHttpEndpointInput
) {
  const endpointUrl = `${input.mailBridgeUrl}/postal/mail/inbound/${input.orgId}/${input.serverPublicId}`;
  const uuid = randomUUID();
  const [{ insertId }] = await postalDB.insert(httpEndpoints).values({
    name: `uninbox-mail-bridge-http-${input.serverPublicId}`,
    url: endpointUrl,
    encoding: 'BodyAsJSON',
    format: 'RawMessage',
    stripReplies: 0,
    serverId: input.serverId,
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
    includeAttachments: 1,
    timeout: 30,
    uuid
  });
  return { endpointUrl, endpointId: insertId };
}

export type SetMailServerRouteForDomainInput = {
  orgId: number;
  domainId: string;
  serverId: number;
  endpointId: number;
  username: string;
};
export async function setMailServerRouteForDomain(
  input: SetMailServerRouteForDomainInput
) {
  const uuid = randomUUID();
  const token = randomAlphaNumeric(8);
  const domainQuery = await postalDB.query.domains.findFirst({
    where: eq(domains.uuid, input.domainId),
    columns: {
      id: true
    }
  });
  if (!domainQuery?.id) {
    throw new Error('Domain not found');
  }
  const domainId = domainQuery.id;
  await postalDB.insert(routes).values({
    domainId: domainId,
    serverId: input.serverId,
    name: input.username || '*',
    endpointId: input.endpointId,
    endpointType: 'HTTPEndpoint',
    spamMode: 'Mark',
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
    token,
    mode: 'Endpoint',
    uuid
  });

  return { token };
}

export type AddMailServerInput = {
  orgId: number;
  serverPublicId: string;
  defaultIpPoolId: number;
};

// This function takes time to complete, so use it with caution
export async function addMailServer(input: AddMailServerInput) {
  const uuid = randomUUID();
  const token = randomAlphaNumeric(6);

  const [{ insertId }] = await postalDB.insert(servers).values({
    organizationId: input.orgId,
    name: input.serverPublicId,
    mode: 'Live',
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
    permalink: input.serverPublicId.toLowerCase().replaceAll('_', '-'),
    token,
    messageRetentionDays: 60,
    ipPoolId: input.defaultIpPoolId,
    uuid,
    rawMessageRetentionDays: 30,
    rawMessageRetentionSize: 2048,
    privacyMode: 0,
    allowSender: 0,
    logSmtpData: 0,
    spamThreshold: '5',
    spamFailureThreshold: '20'
  });

  // Start Magic
  await rawMySqlConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`postal-server-${insertId}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await rawMySqlConnection.query(`USE \`postal-server-${insertId}\``);

  // Don't touch this
  const createMailServerQuery = [
    'CREATE TABLE `clicks` (',
    '  `id` int(11) NOT NULL,',
    '  `message_id` int(11) DEFAULT NULL,',
    '  `link_id` int(11) DEFAULT NULL,',
    '  `ip_address` varchar(255) DEFAULT NULL,',
    '  `country` varchar(255) DEFAULT NULL,',
    '  `city` varchar(255) DEFAULT NULL,',
    '  `user_agent` varchar(255) DEFAULT NULL,',
    '  `timestamp` decimal(18,6) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `deliveries` (',
    '  `id` int(11) NOT NULL,',
    '  `message_id` int(11) DEFAULT NULL,',
    '  `status` varchar(255) DEFAULT NULL,',
    '  `code` int(11) DEFAULT NULL,',
    '  `output` varchar(512) DEFAULT NULL,',
    '  `details` varchar(512) DEFAULT NULL,',
    '  `sent_with_ssl` tinyint(1) DEFAULT 0,',
    '  `log_id` varchar(100) DEFAULT NULL,',
    '  `timestamp` decimal(18,6) DEFAULT NULL,',
    '  `time` decimal(8,2) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `links` (',
    '  `id` int(11) NOT NULL,',
    '  `message_id` int(11) DEFAULT NULL,',
    '  `token` varchar(255) DEFAULT NULL,',
    '  `hash` varchar(255) DEFAULT NULL,',
    '  `url` text DEFAULT NULL,',
    '  `timestamp` decimal(18,6) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `live_stats` (',
    '  `type` varchar(20) NOT NULL,',
    '  `minute` int(11) NOT NULL,',
    '  `count` int(11) DEFAULT NULL,',
    '  `timestamp` decimal(18,6) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `loads` (',
    '  `id` int(11) NOT NULL,',
    '  `message_id` int(11) DEFAULT NULL,',
    '  `ip_address` varchar(255) DEFAULT NULL,',
    '  `country` varchar(255) DEFAULT NULL,',
    '  `city` varchar(255) DEFAULT NULL,',
    '  `user_agent` varchar(255) DEFAULT NULL,',
    '  `timestamp` decimal(18,6) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `messages` (',
    '  `id` int(11) NOT NULL,',
    '  `token` varchar(255) DEFAULT NULL,',
    '  `scope` varchar(10) DEFAULT NULL,',
    '  `rcpt_to` varchar(255) DEFAULT NULL,',
    '  `mail_from` varchar(255) DEFAULT NULL,',
    '  `subject` varchar(255) DEFAULT NULL,',
    '  `message_id` varchar(255) DEFAULT NULL,',
    '  `timestamp` decimal(18,6) DEFAULT NULL,',
    '  `route_id` int(11) DEFAULT NULL,',
    '  `domain_id` int(11) DEFAULT NULL,',
    '  `credential_id` int(11) DEFAULT NULL,',
    '  `status` varchar(255) DEFAULT NULL,',
    '  `held` tinyint(1) DEFAULT 0,',
    '  `size` varchar(255) DEFAULT NULL,',
    '  `last_delivery_attempt` decimal(18,6) DEFAULT NULL,',
    '  `raw_table` varchar(255) DEFAULT NULL,',
    '  `raw_body_id` int(11) DEFAULT NULL,',
    '  `raw_headers_id` int(11) DEFAULT NULL,',
    '  `inspected` tinyint(1) DEFAULT 0,',
    '  `spam` tinyint(1) DEFAULT 0,',
    '  `spam_score` decimal(8,2) DEFAULT 0.00,',
    '  `threat` tinyint(1) DEFAULT 0,',
    '  `threat_details` varchar(255) DEFAULT NULL,',
    '  `bounce` tinyint(1) DEFAULT 0,',
    '  `bounce_for_id` int(11) DEFAULT 0,',
    '  `tag` varchar(255) DEFAULT NULL,',
    '  `loaded` decimal(18,6) DEFAULT NULL,',
    '  `clicked` decimal(18,6) DEFAULT NULL,',
    '  `received_with_ssl` tinyint(1) DEFAULT NULL,',
    '  `hold_expiry` decimal(18,6) DEFAULT NULL,',
    '  `tracked_links` int(11) DEFAULT 0,',
    '  `tracked_images` int(11) DEFAULT 0,',
    '  `parsed` tinyint(4) DEFAULT 0,',
    '  `endpoint_id` int(11) DEFAULT NULL,',
    '  `endpoint_type` varchar(255) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `migrations` (',
    '  `version` int(11) NOT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `raw_message_sizes` (',
    '  `id` int(11) NOT NULL,',
    '  `table_name` varchar(255) DEFAULT NULL,',
    '  `size` bigint(20) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `spam_checks` (',
    '  `id` int(11) NOT NULL,',
    '  `message_id` int(11) DEFAULT NULL,',
    '  `score` decimal(8,2) DEFAULT NULL,',
    '  `code` varchar(255) DEFAULT NULL,',
    '  `description` varchar(255) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `stats_daily` (',
    '  `id` int(11) NOT NULL,',
    '  `time` int(11) DEFAULT NULL,',
    '  `incoming` bigint(20) DEFAULT NULL,',
    '  `outgoing` bigint(20) DEFAULT NULL,',
    '  `spam` bigint(20) DEFAULT NULL,',
    '  `bounces` bigint(20) DEFAULT NULL,',
    '  `held` bigint(20) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `stats_hourly` (',
    '  `id` int(11) NOT NULL,',
    '  `time` int(11) DEFAULT NULL,',
    '  `incoming` bigint(20) DEFAULT NULL,',
    '  `outgoing` bigint(20) DEFAULT NULL,',
    '  `spam` bigint(20) DEFAULT NULL,',
    '  `bounces` bigint(20) DEFAULT NULL,',
    '  `held` bigint(20) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `stats_monthly` (',
    '  `id` int(11) NOT NULL,',
    '  `time` int(11) DEFAULT NULL,',
    '  `incoming` bigint(20) DEFAULT NULL,',
    '  `outgoing` bigint(20) DEFAULT NULL,',
    '  `spam` bigint(20) DEFAULT NULL,',
    '  `bounces` bigint(20) DEFAULT NULL,',
    '  `held` bigint(20) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `stats_yearly` (',
    '  `id` int(11) NOT NULL,',
    '  `time` int(11) DEFAULT NULL,',
    '  `incoming` bigint(20) DEFAULT NULL,',
    '  `outgoing` bigint(20) DEFAULT NULL,',
    '  `spam` bigint(20) DEFAULT NULL,',
    '  `bounces` bigint(20) DEFAULT NULL,',
    '  `held` bigint(20) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `suppressions` (',
    '  `id` int(11) NOT NULL,',
    '  `type` varchar(255) DEFAULT NULL,',
    '  `address` varchar(255) DEFAULT NULL,',
    '  `reason` varchar(255) DEFAULT NULL,',
    '  `timestamp` decimal(18,6) DEFAULT NULL,',
    '  `keep_until` decimal(18,6) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'CREATE TABLE `webhook_requests` (',
    '  `id` int(11) NOT NULL,',
    '  `uuid` varchar(255) DEFAULT NULL,',
    '  `event` varchar(255) DEFAULT NULL,',
    '  `attempt` int(11) DEFAULT NULL,',
    '  `timestamp` decimal(18,6) DEFAULT NULL,',
    '  `status_code` int(1) DEFAULT NULL,',
    '  `body` text DEFAULT NULL,',
    '  `payload` text DEFAULT NULL,',
    '  `will_retry` tinyint(4) DEFAULT NULL,',
    '  `url` varchar(255) DEFAULT NULL,',
    '  `webhook_id` int(11) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '',
    'ALTER TABLE `clicks`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD KEY `on_message_id` (`message_id`) USING BTREE,',
    '  ADD KEY `on_link_id` (`link_id`) USING BTREE;',
    'ALTER TABLE `deliveries`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD KEY `on_message_id` (`message_id`) USING BTREE;',
    'ALTER TABLE `links`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD KEY `on_message_id` (`message_id`) USING BTREE,',
    '  ADD KEY `on_token` (`token`(8)) USING BTREE;',
    'ALTER TABLE `live_stats`',
    '  ADD PRIMARY KEY (`minute`,`type`(8));',
    'ALTER TABLE `loads`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD KEY `on_message_id` (`message_id`) USING BTREE;',
    'ALTER TABLE `messages`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD KEY `on_message_id` (`message_id`(8)) USING BTREE,',
    '  ADD KEY `on_token` (`token`(6)) USING BTREE,',
    '  ADD KEY `on_bounce_for_id` (`bounce_for_id`) USING BTREE,',
    '  ADD KEY `on_held` (`held`) USING BTREE,',
    '  ADD KEY `on_scope_and_status` (`scope`(1),`spam`,`status`(6),`timestamp`) USING BTREE,',
    '  ADD KEY `on_scope_and_tag` (`scope`(1),`spam`,`tag`(8),`timestamp`) USING BTREE,',
    '  ADD KEY `on_scope_and_spam` (`scope`(1),`spam`,`timestamp`) USING BTREE,',
    '  ADD KEY `on_scope_and_thr_status` (`scope`(1),`threat`,`status`(6),`timestamp`) USING BTREE,',
    '  ADD KEY `on_scope_and_threat` (`scope`(1),`threat`,`timestamp`) USING BTREE,',
    '  ADD KEY `on_rcpt_to` (`rcpt_to`(12),`timestamp`) USING BTREE,',
    '  ADD KEY `on_mail_from` (`mail_from`(12),`timestamp`) USING BTREE,',
    '  ADD KEY `on_raw_table` (`raw_table`(14)) USING BTREE,',
    '  ADD KEY `on_status` (`status`(8)) USING BTREE;',
    'ALTER TABLE `migrations`',
    '  ADD PRIMARY KEY (`version`);',
    'ALTER TABLE `raw_message_sizes`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD KEY `on_table_name` (`table_name`(14)) USING BTREE;',
    'ALTER TABLE `spam_checks`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD KEY `on_message_id` (`message_id`) USING BTREE,',
    '  ADD KEY `on_code` (`code`(8)) USING BTREE;',
    'ALTER TABLE `stats_daily`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD UNIQUE KEY `on_time` (`time`);',
    'ALTER TABLE `stats_hourly`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD UNIQUE KEY `on_time` (`time`);',
    'ALTER TABLE `stats_monthly`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD UNIQUE KEY `on_time` (`time`);',
    'ALTER TABLE `stats_yearly`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD UNIQUE KEY `on_time` (`time`);',
    'ALTER TABLE `suppressions`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD KEY `on_address` (`address`(6)) USING BTREE,',
    '  ADD KEY `on_keep_until` (`keep_until`) USING BTREE;',
    'ALTER TABLE `webhook_requests`',
    '  ADD PRIMARY KEY (`id`),',
    '  ADD KEY `on_uuid` (`uuid`(8)) USING BTREE,',
    '  ADD KEY `on_event` (`event`(8)) USING BTREE,',
    '  ADD KEY `on_timestamp` (`timestamp`) USING BTREE,',
    '  ADD KEY `on_webhook_id` (`webhook_id`) USING BTREE;',
    'ALTER TABLE `clicks`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `deliveries`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `links`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `loads`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `messages`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `raw_message_sizes`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `spam_checks`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `stats_daily`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `stats_hourly`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `stats_monthly`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `stats_yearly`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `suppressions`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;',
    'ALTER TABLE `webhook_requests`',
    '  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;'
  ]
    .join('\n')
    .replaceAll('\t', ' ');

  await rawMySqlConnection.query(createMailServerQuery);
  await rawMySqlConnection.query(`USE \`postal\``);
  // End Magic

  return {
    serverId: insertId,
    token
  };
}
