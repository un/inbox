import {
  mysqlTable,
  int,
  varchar,
  datetime,
  index,
  tinyint,
  text,
  unique,
  decimal,
  bigint,
} from "drizzle-orm/mysql-core";

export const additionalRouteEndpoints = mysqlTable(
  "additional_route_endpoints",
  {
    id: int("id").autoincrement().notNull(),
    routeId: int("route_id"),
    endpointType: varchar("endpoint_type", { length: 255 }),
    endpointId: int("endpoint_id"),
    createdAt: datetime("created_at", { mode: "string" }).notNull(),
    updatedAt: datetime("updated_at", { mode: "string" }).notNull(),
  }
);

export const addressEndpoints = mysqlTable("address_endpoints", {
  id: int("id").autoincrement().notNull(),
  serverId: int("server_id"),
  uuid: varchar("uuid", { length: 255 }),
  address: varchar("address", { length: 255 }),
  lastUsedAt: datetime("last_used_at", { mode: "string" }),
  createdAt: datetime("created_at", { mode: "string" }).notNull(),
  updatedAt: datetime("updated_at", { mode: "string" }).notNull(),
});

export const arInternalMetadata = mysqlTable("ar_internal_metadata", {
  key: varchar("key", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }),
  createdAt: datetime("created_at", { mode: "string", fsp: 6 }).notNull(),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }).notNull(),
});

export const authieSessions = mysqlTable(
  "authie_sessions",
  {
    id: int("id").autoincrement().notNull(),
    token: varchar("token", { length: 255 }),
    browserId: varchar("browser_id", { length: 255 }),
    userId: int("user_id"),
    active: tinyint("active").default(1),
    data: text("data"),
    expiresAt: datetime("expires_at", { mode: "string" }),
    loginAt: datetime("login_at", { mode: "string" }),
    loginIp: varchar("login_ip", { length: 255 }),
    lastActivityAt: datetime("last_activity_at", { mode: "string" }),
    lastActivityIp: varchar("last_activity_ip", { length: 255 }),
    lastActivityPath: varchar("last_activity_path", { length: 255 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: datetime("created_at", { mode: "string" }),
    updatedAt: datetime("updated_at", { mode: "string" }),
    userType: varchar("user_type", { length: 255 }),
    parentId: int("parent_id"),
    twoFactoredAt: datetime("two_factored_at", { mode: "string" }),
    twoFactoredIp: varchar("two_factored_ip", { length: 255 }),
    requests: int("requests").default(0),
    passwordSeenAt: datetime("password_seen_at", { mode: "string" }),
    tokenHash: varchar("token_hash", { length: 255 }),
    host: varchar("host", { length: 255 }),
    skipTwoFactor: tinyint("skip_two_factor").default(0),
    loginIpCountry: varchar("login_ip_country", { length: 255 }),
    twoFactoredIpCountry: varchar("two_factored_ip_country", {
      length: 255,
    }),
    lastActivityIpCountry: varchar("last_activity_ip_country", {
      length: 255,
    }),
  },
  (table) => {
    return {
      indexAuthieSessionsOnBrowserId: index(
        "index_authie_sessions_on_browser_id"
      ).on(table.browserId),
      indexAuthieSessionsOnToken: index("index_authie_sessions_on_token").on(
        table.token
      ),
      indexAuthieSessionsOnTokenHash: index(
        "index_authie_sessions_on_token_hash"
      ).on(table.tokenHash),
      indexAuthieSessionsOnUserId: index("index_authie_sessions_on_user_id").on(
        table.userId
      ),
    };
  }
);

export const credentials = mysqlTable("credentials", {
  id: int("id").autoincrement().notNull(),
  serverId: int("server_id"),
  key: varchar("key", { length: 255 }),
  type: varchar("type", { length: 255 }),
  name: varchar("name", { length: 255 }),
  options: text("options"),
  lastUsedAt: datetime("last_used_at", { mode: "string", fsp: 6 }).default(
    "NULL"
  ),
  createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
  hold: tinyint("hold").default(0),
  uuid: varchar("uuid", { length: 255 }),
});

export const domains = mysqlTable(
  "domains",
  {
    id: int("id").autoincrement().notNull(),
    serverId: int("server_id"),
    uuid: varchar("uuid", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    verificationToken: varchar("verification_token", { length: 255 }).notNull(),
    verificationMethod: varchar("verification_method", { length: 255 }),
    verifiedAt: datetime("verified_at", { mode: "string" }),
    dkimPrivateKey: text("dkim_private_key").notNull(),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
    dnsCheckedAt: datetime("dns_checked_at", {
      mode: "string",
      fsp: 6,
    }),
    spfStatus: varchar("spf_status", { length: 255 }),
    spfError: varchar("spf_error", { length: 255 }),
    dkimStatus: varchar("dkim_status", { length: 255 }),
    dkimError: varchar("dkim_error", { length: 255 }),
    mxStatus: varchar("mx_status", { length: 255 }),
    mxError: varchar("mx_error", { length: 255 }),
    returnPathStatus: varchar("return_path_status", { length: 255 }),
    returnPathError: varchar("return_path_error", { length: 255 }),
    outgoing: tinyint("outgoing").default(1),
    incoming: tinyint("incoming").default(1),
    ownerType: varchar("owner_type", { length: 255 }),
    ownerId: int("owner_id"),
    dkimIdentifierString: varchar("dkim_identifier_string", {
      length: 255,
    }),
    useForAny: tinyint("use_for_any"),
  },
  (table) => {
    return {
      indexDomainsOnServerId: index("index_domains_on_server_id").on(
        table.serverId
      ),
      indexDomainsOnUuid: index("index_domains_on_uuid").on(table.uuid),
    };
  }
);

export const httpEndpoints = mysqlTable("http_endpoints", {
  id: int("id").autoincrement().notNull(),
  serverId: int("server_id"),
  uuid: varchar("uuid", { length: 255 }),
  name: varchar("name", { length: 255 }),
  url: varchar("url", { length: 255 }),
  encoding: varchar("encoding", { length: 255 }),
  format: varchar("format", { length: 255 }),
  stripReplies: tinyint("strip_replies").default(0),
  error: text("error"),
  disabledUntil: datetime("disabled_until", { mode: "string", fsp: 6 }).default(
    "NULL"
  ),
  lastUsedAt: datetime("last_used_at", { mode: "string", fsp: 6 }).default(
    "NULL"
  ),
  createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
  includeAttachments: tinyint("include_attachments").default(1),
  timeout: int("timeout"),
});

export const ipAddresses = mysqlTable("ip_addresses", {
  id: int("id").autoincrement().notNull(),
  ipPoolId: int("ip_pool_id"),
  ipv4: varchar("ipv4", { length: 255 }),
  ipv6: varchar("ipv6", { length: 255 }),
  createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
  hostname: varchar("hostname", { length: 255 }),
  priority: int("priority"),
});

export const ipPools = mysqlTable(
  "ip_pools",
  {
    id: int("id").autoincrement().notNull(),
    name: varchar("name", { length: 255 }),
    uuid: varchar("uuid", { length: 255 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
    default: tinyint("default").default(0),
  },
  (table) => {
    return {
      indexIpPoolsOnUuid: index("index_ip_pools_on_uuid").on(table.uuid),
    };
  }
);

export const ipPoolRules = mysqlTable("ip_pool_rules", {
  id: int("id").autoincrement().notNull(),
  uuid: varchar("uuid", { length: 255 }),
  ownerType: varchar("owner_type", { length: 255 }),
  ownerId: int("owner_id"),
  ipPoolId: int("ip_pool_id"),
  fromText: text("from_text"),
  toText: text("to_text"),
  createdAt: datetime("created_at", { mode: "string" }).notNull(),
  updatedAt: datetime("updated_at", { mode: "string" }).notNull(),
});

export const organizations = mysqlTable(
  "organizations",
  {
    id: int("id").autoincrement().notNull(),
    uuid: varchar("uuid", { length: 255 }),
    name: varchar("name", { length: 255 }),
    permalink: varchar("permalink", { length: 255 }),
    timeZone: varchar("time_zone", { length: 255 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
    ipPoolId: int("ip_pool_id"),
    ownerId: int("owner_id"),
    deletedAt: datetime("deleted_at", { mode: "string", fsp: 6 }),
    suspendedAt: datetime("suspended_at", { mode: "string", fsp: 6 }),
    suspensionReason: varchar("suspension_reason", { length: 255 }),
  },
  (table) => {
    return {
      indexOrganizationsOnPermalink: index(
        "index_organizations_on_permalink"
      ).on(table.permalink),
      indexOrganizationsOnUuid: index("index_organizations_on_uuid").on(
        table.uuid
      ),
    };
  }
);

export const organizationIpPools = mysqlTable("organization_ip_pools", {
  id: int("id").autoincrement().notNull(),
  organizationId: int("organization_id"),
  ipPoolId: int("ip_pool_id"),
  createdAt: datetime("created_at", { mode: "string" }).notNull(),
  updatedAt: datetime("updated_at", { mode: "string" }).notNull(),
});

export const organizationUsers = mysqlTable("organization_users", {
  id: int("id").autoincrement().notNull(),
  organizationId: int("organization_id"),
  userId: int("user_id"),
  createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
  admin: tinyint("admin").default(0),
  allServers: tinyint("all_servers").default(1),
  userType: varchar("user_type", { length: 255 }),
});

export const queuedMessages = mysqlTable(
  "queued_messages",
  {
    id: int("id").autoincrement().notNull(),
    serverId: int("server_id"),
    messageId: int("message_id"),
    domain: varchar("domain", { length: 255 }),
    lockedBy: varchar("locked_by", { length: 255 }),
    lockedAt: datetime("locked_at", { mode: "string", fsp: 6 }),
    retryAfter: datetime("retry_after", { mode: "string" }),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
    ipAddressId: int("ip_address_id"),
    attempts: int("attempts").default(0),
    routeId: int("route_id"),
    manual: tinyint("manual").default(0),
    batchKey: varchar("batch_key", { length: 255 }),
  },
  (table) => {
    return {
      indexQueuedMessagesOnDomain: index("index_queued_messages_on_domain").on(
        table.domain
      ),
      indexQueuedMessagesOnMessageId: index(
        "index_queued_messages_on_message_id"
      ).on(table.messageId),
      indexQueuedMessagesOnServerId: index(
        "index_queued_messages_on_server_id"
      ).on(table.serverId),
    };
  }
);

export const routes = mysqlTable(
  "routes",
  {
    id: int("id").autoincrement().notNull(),
    uuid: varchar("uuid", { length: 255 }),
    serverId: int("server_id"),
    domainId: int("domain_id"),
    endpointId: int("endpoint_id"),
    endpointType: varchar("endpoint_type", { length: 255 }),
    name: varchar("name", { length: 255 }),
    spamMode: varchar("spam_mode", { length: 255 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
    token: varchar("token", { length: 255 }),
    mode: varchar("mode", { length: 255 }),
  },
  (table) => {
    return {
      indexRoutesOnToken: index("index_routes_on_token").on(table.token),
    };
  }
);

export const scheduledTasks = mysqlTable(
  "scheduled_tasks",
  {
    id: bigint("id", { mode: "number" }).autoincrement().notNull(),
    name: varchar("name", { length: 255 }),
    nextRunAfter: datetime("next_run_after", { mode: "string" }),
  },
  (table) => {
    return {
      indexScheduledTasksOnName: unique("index_scheduled_tasks_on_name").on(
        table.name
      ),
    };
  }
);

export const schemaMigrations = mysqlTable("schema_migrations", {
  version: varchar("version", { length: 255 }).notNull(),
});

export const servers = mysqlTable(
  "servers",
  {
    id: int("id").autoincrement().notNull(),
    organizationId: int("organization_id"),
    uuid: varchar("uuid", { length: 255 }),
    name: varchar("name", { length: 255 }),
    mode: varchar("mode", { length: 255 }),
    ipPoolId: int("ip_pool_id"),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
    permalink: varchar("permalink", { length: 255 }),
    sendLimit: int("send_limit"),
    deletedAt: datetime("deleted_at", { mode: "string", fsp: 6 }),
    messageRetentionDays: int("message_retention_days"),
    rawMessageRetentionDays: int("raw_message_retention_days"),
    rawMessageRetentionSize: int("raw_message_retention_size"),
    allowSender: tinyint("allow_sender").default(0),
    token: varchar("token", { length: 255 }),
    sendLimitApproachingAt: datetime("send_limit_approaching_at", {
      mode: "string",
      fsp: 6,
    }),
    sendLimitApproachingNotifiedAt: datetime(
      "send_limit_approaching_notified_at",
      { mode: "string", fsp: 6 }
    ),
    sendLimitExceededAt: datetime("send_limit_exceeded_at", {
      mode: "string",
      fsp: 6,
    }),
    sendLimitExceededNotifiedAt: datetime("send_limit_exceeded_notified_at", {
      mode: "string",
      fsp: 6,
    }),
    spamThreshold: decimal("spam_threshold", {
      precision: 8,
      scale: 2,
    }),
    spamFailureThreshold: decimal("spam_failure_threshold", {
      precision: 8,
      scale: 2,
    }),
    postmasterAddress: varchar("postmaster_address", { length: 255 }),
    suspendedAt: datetime("suspended_at", { mode: "string", fsp: 6 }),
    outboundSpamThreshold: decimal("outbound_spam_threshold", {
      precision: 8,
      scale: 2,
    }),
    domainsNotToClickTrack: text("domains_not_to_click_track"),
    suspensionReason: varchar("suspension_reason", { length: 255 }),
    logSmtpData: tinyint("log_smtp_data").default(0),
    privacyMode: tinyint("privacy_mode").default(0),
  },
  (table) => {
    return {
      indexServersOnOrganizationId: index(
        "index_servers_on_organization_id"
      ).on(table.organizationId),
      indexServersOnPermalink: index("index_servers_on_permalink").on(
        table.permalink
      ),
      indexServersOnToken: index("index_servers_on_token").on(table.token),
      indexServersOnUuid: index("index_servers_on_uuid").on(table.uuid),
    };
  }
);

export const smtpEndpoints = mysqlTable("smtp_endpoints", {
  id: int("id").autoincrement().notNull(),
  serverId: int("server_id"),
  uuid: varchar("uuid", { length: 255 }),
  name: varchar("name", { length: 255 }),
  hostname: varchar("hostname", { length: 255 }),
  sslMode: varchar("ssl_mode", { length: 255 }),
  port: int("port"),
  error: text("error"),
  disabledUntil: datetime("disabled_until", { mode: "string", fsp: 6 }).default(
    "NULL"
  ),
  lastUsedAt: datetime("last_used_at", { mode: "string", fsp: 6 }).default(
    "NULL"
  ),
  createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
});

export const statistics = mysqlTable("statistics", {
  id: int("id").autoincrement().notNull(),
  totalMessages: bigint("total_messages", { mode: "number" }),
  totalOutgoing: bigint("total_outgoing", { mode: "number" }),
  totalIncoming: bigint("total_incoming", { mode: "number" }),
});

export const trackCertificates = mysqlTable(
  "track_certificates",
  {
    id: int("id").autoincrement().notNull(),
    domain: varchar("domain", { length: 255 }),
    certificate: text("certificate"),
    intermediaries: text("intermediaries"),
    key: text("key"),
    expiresAt: datetime("expires_at", { mode: "string" }),
    renewAfter: datetime("renew_after", { mode: "string" }),
    verificationPath: varchar("verification_path", { length: 255 }),
    verificationString: varchar("verification_string", { length: 255 }),
    createdAt: datetime("created_at", { mode: "string" }).notNull(),
    updatedAt: datetime("updated_at", { mode: "string" }).notNull(),
  },
  (table) => {
    return {
      indexTrackCertificatesOnDomain: index(
        "index_track_certificates_on_domain"
      ).on(table.domain),
    };
  }
);

export const trackDomains = mysqlTable("track_domains", {
  id: int("id").autoincrement().notNull(),
  uuid: varchar("uuid", { length: 255 }),
  serverId: int("server_id"),
  domainId: int("domain_id"),
  name: varchar("name", { length: 255 }),
  dnsCheckedAt: datetime("dns_checked_at", { mode: "string" }),
  dnsStatus: varchar("dns_status", { length: 255 }),
  dnsError: varchar("dns_error", { length: 255 }),
  createdAt: datetime("created_at", { mode: "string" }).notNull(),
  updatedAt: datetime("updated_at", { mode: "string" }).notNull(),
  sslEnabled: tinyint("ssl_enabled").default(1),
  trackClicks: tinyint("track_clicks").default(1),
  trackLoads: tinyint("track_loads").default(1),
  excludedClickDomains: text("excluded_click_domains"),
});

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().notNull(),
    uuid: varchar("uuid", { length: 255 }),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    emailAddress: varchar("email_address", { length: 255 }),
    passwordDigest: varchar("password_digest", { length: 255 }),
    timeZone: varchar("time_zone", { length: 255 }),
    emailVerificationToken: varchar("email_verification_token", {
      length: 255,
    }),
    emailVerifiedAt: datetime("email_verified_at", { mode: "string" }),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
    passwordResetToken: varchar("password_reset_token", {
      length: 255,
    }),
    passwordResetTokenValidUntil: datetime("password_reset_token_valid_until", {
      mode: "string",
    }),
    admin: tinyint("admin").default(0),
  },
  (table) => {
    return {
      indexUsersOnEmailAddress: index("index_users_on_email_address").on(
        table.emailAddress
      ),
      indexUsersOnUuid: index("index_users_on_uuid").on(table.uuid),
    };
  }
);

export const userInvites = mysqlTable(
  "user_invites",
  {
    id: int("id").autoincrement().notNull(),
    uuid: varchar("uuid", { length: 255 }),
    emailAddress: varchar("email_address", { length: 255 }),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 6 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
  },
  (table) => {
    return {
      indexUserInvitesOnUuid: index("index_user_invites_on_uuid").on(
        table.uuid
      ),
    };
  }
);

export const webhooks = mysqlTable(
  "webhooks",
  {
    id: int("id").autoincrement().notNull(),
    serverId: int("server_id"),
    uuid: varchar("uuid", { length: 255 }),
    name: varchar("name", { length: 255 }),
    url: varchar("url", { length: 255 }),
    lastUsedAt: datetime("last_used_at", { mode: "string" }),
    allEvents: tinyint("all_events").default(0),
    enabled: tinyint("enabled").default(1),
    sign: tinyint("sign").default(1),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }),
  },
  (table) => {
    return {
      indexWebhooksOnServerId: index("index_webhooks_on_server_id").on(
        table.serverId
      ),
    };
  }
);

export const webhookEvents = mysqlTable(
  "webhook_events",
  {
    id: int("id").autoincrement().notNull(),
    webhookId: int("webhook_id"),
    event: varchar("event", { length: 255 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
  },
  (table) => {
    return {
      indexWebhookEventsOnWebhookId: index(
        "index_webhook_events_on_webhook_id"
      ).on(table.webhookId),
    };
  }
);

export const webhookRequests = mysqlTable(
  "webhook_requests",
  {
    id: int("id").autoincrement().notNull(),
    serverId: int("server_id"),
    webhookId: int("webhook_id"),
    url: varchar("url", { length: 255 }),
    event: varchar("event", { length: 255 }),
    uuid: varchar("uuid", { length: 255 }),
    payload: text("payload"),
    attempts: int("attempts").default(0),
    retryAfter: datetime("retry_after", { mode: "string", fsp: 6 }),
    error: text("error"),
    createdAt: datetime("created_at", { mode: "string", fsp: 6 }),
    lockedBy: varchar("locked_by", { length: 255 }),
    lockedAt: datetime("locked_at", { mode: "string" }),
  },
  (table) => {
    return {
      indexWebhookRequestsOnLockedBy: index(
        "index_webhook_requests_on_locked_by"
      ).on(table.lockedBy),
    };
  }
);

export const workerRoles = mysqlTable(
  "worker_roles",
  {
    id: bigint("id", { mode: "number" }).autoincrement().notNull(),
    role: varchar("role", { length: 255 }),
    worker: varchar("worker", { length: 255 }),
    acquiredAt: datetime("acquired_at", { mode: "string" }),
  },
  (table) => {
    return {
      indexWorkerRolesOnRole: unique("index_worker_roles_on_role").on(
        table.role
      ),
    };
  }
);
