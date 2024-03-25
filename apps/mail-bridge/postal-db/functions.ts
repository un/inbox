import { connection as rawMySqlConnection, postalDB } from '.';
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
import { randomUUID } from 'node:crypto';
import {
  generateDKIMKeyPair,
  generatePublicKey,
  getUniqueDKIMSelector,
  randomAlphaNumeric
} from './generators';
import { and, eq, sql } from 'drizzle-orm/sql';
import { lookupCNAME, lookupMX, lookupTXT } from '@u22n/utils/dns';
import {
  buildDkimRecord,
  buildSpfRecord,
  parseDkim,
  parseSpfIncludes,
  parseDmarc,
  buildDmarcRecord
} from '@u22n/utils/dns/txtParsers';
import { useRuntimeConfig } from '#imports';

export type CreateOrgInput = {
  orgPublicId: string;
  ipPoolId: number;
};

const postalConfig = useRuntimeConfig().postal as Record<string, any>;

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
  forceReverify: boolean = false
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
        txtRecords.data.find((_) => _.startsWith('v=spf1')) || ''
      )
    : null;
  records.spf.name = '@';
  records.spf.extraSenders =
    (spfDomains &&
      spfDomains.includes.filter((x) => x !== `_spf.${postalConfig.dnsRootUrl}`)
        .length > 0) ||
    false;

  // We need to resolve duplicate entries incase the spf record is already included, so that we don't have duplicate entries
  const allSenders = Array.from(
    new Set([
      `_spf.${postalConfig.dnsRootUrl}`,
      ...(records.spf.extraSenders ? spfDomains?.includes || [] : [])
    ]).values()
  );

  records.spf.value = buildSpfRecord(allSenders, '~all');
  records.spf.valid =
    (spfDomains &&
      spfDomains.includes.includes(`_spf.${postalConfig.dnsRootUrl}`)) ||
    false;

  if (!records.spf.valid || domainInfo.spfStatus !== 'OK' || forceReverify) {
    await postalDB
      .update(domains)
      .set(
        !spfDomains
          ? { spfStatus: 'Missing', spfError: 'SPF record not found' }
          : !spfDomains.includes.includes(`_spf.${postalConfig.dnsRootUrl}`)
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
        domainKeyRecords.data.find((_) => _.startsWith('v=DKIM1')) || ''
      );
      if (
        !domainKey ||
        domainKey['h'] !== 'sha256' ||
        domainKey['p'] !== publicKey
      ) {
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
      dmarcRecord.data.find((_) => _.startsWith('v=DMARC1')) || ''
    );
    if (dmarcValues) {
      records.dmarc.policy =
        (dmarcValues['p'] as 'reject' | 'quarantine' | 'none') || null;
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
    encoding: 'BodyAsJson',
    format: 'Hash',
    stripReplies: 1,
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
  if (!domainQuery || !domainQuery.id) {
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
    `CREATE DATABASE \`postal-server-${insertId}\``
  );
  await rawMySqlConnection.query(`USE \`postal-server-${insertId}\``);

  // Don't touch this
  const createMailServerQuery = [
    'CREATE TABLE `clicks` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `message_id` int(11),',
    '  `link_id` int(11),',
    '  `ip_address` varchar(255),',
    '  `country` varchar(255),',
    '  `city` varchar(255),',
    '  `user_agent` varchar(255),',
    '  `timestamp` decimal(18,6),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `deliveries` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `message_id` int(11),',
    '  `status` varchar(255),',
    '  `code` int(11),',
    '  `output` varchar(512),',
    '  `details` varchar(512),',
    '  `sent_with_ssl` tinyint DEFAULT 0,',
    '  `log_id` varchar(100),',
    '  `timestamp` decimal(18,6),',
    '  `time` decimal(8,2),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `links` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `message_id` int(11),',
    '  `token` varchar(255),',
    '  `hash` varchar(255),',
    '  `url` text,',
    '  `timestamp` decimal(18,6),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `live_stats` (',
    '  `type` varchar(20) NOT NULL,',
    '  `minute` int(11) NOT NULL,',
    '  `count` int(11),',
    '  `timestamp` decimal(18,6)',
    ');',
    '',
    'CREATE TABLE `loads` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `message_id` int(11),',
    '  `ip_address` varchar(255),',
    '  `country` varchar(255),',
    '  `city` varchar(255),',
    '  `user_agent` varchar(255),',
    '  `timestamp` decimal(18,6),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `messages` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `token` varchar(255),',
    '  `scope` varchar(10),',
    '  `rcpt_to` varchar(255),',
    '  `mail_from` varchar(255),',
    '  `subject` varchar(255),',
    '  `message_id` varchar(255),',
    '  `timestamp` decimal(18,6),',
    '  `route_id` int(11),',
    '  `domain_id` int(11),',
    '  `credential_id` int(11),',
    '  `status` varchar(255),',
    '  `held` tinyint DEFAULT 0,',
    '  `size` varchar(255),',
    '  `last_delivery_attempt` decimal(18,6),',
    '  `raw_table` varchar(255),',
    '  `raw_body_id` int(11),',
    '  `raw_headers_id` int(11),',
    '  `inspected` tinyint DEFAULT 0,',
    '  `spam` tinyint DEFAULT 0,',
    "  `spam_score` decimal(8,2) DEFAULT '0.00',",
    '  `threat` tinyint DEFAULT 0,',
    '  `threat_details` varchar(255),',
    '  `bounce` tinyint DEFAULT 0,',
    '  `bounce_for_id` int(11) DEFAULT 0,',
    '  `tag` varchar(255),',
    '  `loaded` decimal(18,6),',
    '  `clicked` decimal(18,6),',
    '  `received_with_ssl` tinyint,',
    '  `hold_expiry` decimal(18,6),',
    '  `tracked_links` int(11) DEFAULT 0,',
    '  `tracked_images` int(11) DEFAULT 0,',
    '  `parsed` tinyint DEFAULT 0,',
    '  `endpoint_id` int(11),',
    '  `endpoint_type` varchar(255),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `migrations` (',
    '  `version` int(11) NOT NULL',
    ');',
    '',
    'CREATE TABLE `raw_message_sizes` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `table_name` varchar(255),',
    '  `size` bigint(20),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `spam_checks` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `message_id` int(11),',
    '  `score` decimal(8,2),',
    '  `code` varchar(255),',
    '  `description` varchar(255),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `stats_daily` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `time` int(11),',
    '  `incoming` bigint(20),',
    '  `outgoing` bigint(20),',
    '  `spam` bigint(20),',
    '  `bounces` bigint(20),',
    '  `held` bigint(20),',
    '  CONSTRAINT `on_time` UNIQUE(`time`),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `stats_hourly` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `time` int(11),',
    '  `incoming` bigint(20),',
    '  `outgoing` bigint(20),',
    '  `spam` bigint(20),',
    '  `bounces` bigint(20),',
    '  `held` bigint(20),',
    '  CONSTRAINT `on_time` UNIQUE(`time`),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `stats_monthly` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `time` int(11),',
    '  `incoming` bigint(20),',
    '  `outgoing` bigint(20),',
    '  `spam` bigint(20),',
    '  `bounces` bigint(20),',
    '  `held` bigint(20),',
    '  CONSTRAINT `on_time` UNIQUE(`time`),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `stats_yearly` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `time` int(11),',
    '  `incoming` bigint(20),',
    '  `outgoing` bigint(20),',
    '  `spam` bigint(20),',
    '  `bounces` bigint(20),',
    '  `held` bigint(20),',
    '  CONSTRAINT `on_time` UNIQUE(`time`),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `suppressions` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `type` varchar(255),',
    '  `address` varchar(255),',
    '  `reason` varchar(255),',
    '  `timestamp` decimal(18,6),',
    '  `keep_until` decimal(18,6),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE TABLE `webhook_requests` (',
    '  `id` int(11) NOT NULL AUTO_INCREMENT,',
    '  `uuid` varchar(255),',
    '  `event` varchar(255),',
    '  `attempt` int(11),',
    '  `timestamp` decimal(18,6),',
    '  `status_code` int(1),',
    '  `body` text,',
    '  `payload` text,',
    '  `will_retry` tinyint,',
    '  `url` varchar(255),',
    '  `webhook_id` int(11),',
    '  PRIMARY KEY (`id`)',
    ');',
    '',
    'CREATE INDEX `on_message_id` ON `clicks` (`message_id`);',
    'CREATE INDEX `on_link_id` ON `clicks` (`link_id`);',
    'CREATE INDEX `on_message_id` ON `deliveries` (`message_id`);',
    'CREATE INDEX `on_message_id` ON `links` (`message_id`);',
    'CREATE INDEX `on_token` ON `links` (`token`);',
    'CREATE INDEX `on_message_id` ON `loads` (`message_id`);',
    'CREATE INDEX `on_message_id` ON `messages` (`message_id`);',
    'CREATE INDEX `on_token` ON `messages` (`token`);',
    'CREATE INDEX `on_bounce_for_id` ON `messages` (`bounce_for_id`);',
    'CREATE INDEX `on_held` ON `messages` (`held`);',
    'CREATE INDEX `on_scope_and_status` ON `messages` (`scope`,`spam`,`status`,`timestamp`);',
    'CREATE INDEX `on_scope_and_tag` ON `messages` (`scope`,`spam`,`tag`,`timestamp`);',
    'CREATE INDEX `on_scope_and_spam` ON `messages` (`scope`,`spam`,`timestamp`);',
    'CREATE INDEX `on_scope_and_thr_status` ON `messages` (`scope`,`threat`,`status`,`timestamp`);',
    'CREATE INDEX `on_scope_and_threat` ON `messages` (`scope`,`threat`,`timestamp`);',
    'CREATE INDEX `on_rcpt_to` ON `messages` (`rcpt_to`,`timestamp`);',
    'CREATE INDEX `on_mail_from` ON `messages` (`mail_from`,`timestamp`);',
    'CREATE INDEX `on_raw_table` ON `messages` (`raw_table`);',
    'CREATE INDEX `on_status` ON `messages` (`status`);',
    'CREATE INDEX `on_table_name` ON `raw_message_sizes` (`table_name`);',
    'CREATE INDEX `on_message_id` ON `spam_checks` (`message_id`);',
    'CREATE INDEX `on_code` ON `spam_checks` (`code`);',
    'CREATE INDEX `on_address` ON `suppressions` (`address`);',
    'CREATE INDEX `on_keep_until` ON `suppressions` (`keep_until`);',
    'CREATE INDEX `on_uuid` ON `webhook_requests` (`uuid`);',
    'CREATE INDEX `on_event` ON `webhook_requests` (`event`);',
    'CREATE INDEX `on_timestamp` ON `webhook_requests` (`timestamp`);',
    'CREATE INDEX `on_webhook_id` ON `webhook_requests` (`webhook_id`);'
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
