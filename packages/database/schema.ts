import {
  tinyint,
  smallint,
  mediumint,
  bigint,
  boolean,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  serial,
  timestamp,
  index,
  json,
  uniqueIndex,
  varchar,
  text,
  customType
} from 'drizzle-orm/mysql-core';
import { relations, sql } from 'drizzle-orm';
import { nanoIdLength } from '@uninbox/utils';

//TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit

// These custom types support incompatibilities with drizzle-orm or types that must remain in sync across db

// Custom nanoId type = easy increase length later - used as "publicId: nanoId('public_id')
const nanoId = customType<{ data: string; notNull: true }>({
  dataType() {
    return `varchar(${nanoIdLength})`;
  }
});

// Foreign Key type as drizzle does not support unsigned bigint
const foreignKey = customType<{ data: number }>({
  dataType() {
    return 'bigint UNSIGNED';
  }
});

const bigintUnsigned = customType<{ data: number }>({
  dataType() {
    return 'bigint UNSIGNED';
  }
});

// User table
export const users = mysqlTable(
  'users',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    username: varchar('username', { length: 32 }).notNull(),
    recoveryEmail: varchar('recovery_email', { length: 255 }),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    usernameIndex: uniqueIndex('username_idx').on(table.username)
  })
);

export const usersRelations = relations(users, ({ one, many }) => ({
  authIdentities: many(userAuthIdentities),
  orgMemberships: many(orgMembers),
  profiles: many(userProfiles),
  defaultProfile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId]
  }),
  personalOrg: one(orgs, {
    fields: [users.id],
    references: [orgs.ownerId]
  }),
  conversations: many(convoMembers),
  userGroups: many(userGroupMembers),
  routingRules: many(emailRoutingRulesDestinations)
}));

// Identity table (user logins)
export const userAuthIdentities = mysqlTable(
  'user_identities',
  {
    id: serial('id').primaryKey(),
    userId: foreignKey('user_id').notNull(),
    provider: varchar('provider', { length: 32 }).notNull(),
    providerId: varchar('provider_id', { length: 64 }).notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    providerProviderIdIndex: uniqueIndex('provider_provider_id_idx').on(
      table.provider,
      table.providerId
    ),
    userIdProviderIndex: uniqueIndex('user_id_provider_idx').on(
      table.userId,
      table.provider
    ),
    providerIdIndex: index('provider_id_idx').on(table.providerId)
  })
);
export const userAuthIdentitiesRelations = relations(
  userAuthIdentities,
  ({ one }) => ({
    user: one(users, {
      fields: [userAuthIdentities.userId],
      references: [users.id]
    })
  })
);

export const userProfiles = mysqlTable(
  'user_profiles',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    userId: foreignKey('user_id').notNull(),
    firstName: varchar('first_name', { length: 64 }),
    lastName: varchar('last_name', { length: 64 }),
    nickname: varchar('nickname', { length: 64 }),
    title: varchar('title', { length: 64 }),
    blurb: text('blurb'),
    avatarId: varchar('avatar_id', { length: 64 }),
    defaultProfile: boolean('default_profile').notNull().default(false),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId)
  })
);

export const userProfileRelations = relations(
  userProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [userProfiles.userId],
      references: [users.id]
    }),
    orgs: many(orgMembers)
  })
);

// Organization table
export const orgs = mysqlTable(
  'orgs',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    ownerId: foreignKey('owner_id').notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    avatarId: varchar('avatar_Id', { length: 64 }),
    personalOrg: boolean('personal_org').notNull().default(false),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId)
  })
);
export const orgsRelations = relations(orgs, ({ one, many }) => ({
  owner: one(users, {
    fields: [orgs.ownerId],
    references: [users.id]
  }),
  members: many(orgMembers),
  domains: many(domains),
  postalServers: many(postalServers),
  postalConfig: one(orgPostalConfigs, {
    fields: [orgs.id],
    references: [orgPostalConfigs.orgId]
  }),
  modules: many(orgModules),
  userProfiles: many(userProfilesToOrgs)
}));

export const orgMembers = mysqlTable(
  'org_members',
  {
    userId: foreignKey('user_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    invitedByUserId: foreignKey('invited_by_user_id'),
    status: mysqlEnum('status', ['active', 'removed']).notNull(),
    role: mysqlEnum('role', ['member', 'admin']).notNull(),
    userProfileId: foreignKey('user_profile_id').notNull(),
    addedAt: timestamp('added_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    removedAt: timestamp('removed_at')
  },
  (table) => ({
    pk: primaryKey(table.userId, table.orgId)
  })
);
export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id]
  }),
  org: one(orgs, {
    fields: [orgMembers.orgId],
    references: [orgs.id]
  }),
  profile: one(userProfiles, {
    fields: [orgMembers.userProfileId],
    references: [userProfiles.id]
  })
}));

export const userProfilesToOrgs = mysqlTable(
  'user_profiles_to_orgs',
  {
    userProfileId: foreignKey('user_profile_id').notNull(),
    orgId: foreignKey('org_id').notNull()
  },
  (table) => ({
    pk: primaryKey(table.userProfileId, table.orgId)
  })
);

export const userProfilesToOrgsRelations = relations(
  userProfilesToOrgs,
  ({ one }) => ({
    userProfile: one(userProfiles, {
      fields: [userProfilesToOrgs.userProfileId],
      references: [userProfiles.id]
    }),
    org: one(orgs, {
      fields: [userProfilesToOrgs.orgId],
      references: [orgs.id]
    })
  })
);

export const orgInvitations = mysqlTable(
  'org_invitations',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    invitedByUserId: foreignKey('invited_by_user_id').notNull(),
    role: mysqlEnum('role', ['member', 'admin']).notNull(),
    invitedUser: foreignKey('invited_user'),
    email: varchar('email', { length: 128 }),
    inviteToken: varchar('invite_token', { length: 64 }),
    invitedAt: timestamp('invited_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: timestamp('expires_at'),
    acceptedAt: timestamp('accepted_at')
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    orgIdIndex: index('org_id_idx').on(table.orgId),
    orgEmailUniqueIndex: uniqueIndex('org_email_unique_idx').on(
      table.orgId,
      table.email
    )
  })
);
export const orgInvitationsRelations = relations(orgInvitations, ({ one }) => ({
  org: one(orgs, {
    fields: [orgInvitations.orgId],
    references: [orgs.id]
  }),
  invitedByUser: one(users, {
    fields: [orgInvitations.invitedByUserId],
    references: [users.id]
  }),
  invitedUser: one(users, {
    fields: [orgInvitations.invitedUser],
    references: [users.id]
  })
}));

// Opt-ins/modules/add-ons/boosts tables
export const orgModules = mysqlTable(
  'org_modules',
  {
    id: serial('id').primaryKey(),
    orgId: foreignKey('org_id').notNull(),
    module: mysqlEnum('module', [
      'strip signatures',
      'anonymous analytics'
    ]).notNull(),
    enabled: boolean('enabled').notNull().default(false),
    lastModifiedByUser: foreignKey('last_modified_by_user').notNull(),
    lastModifiedAt: timestamp('last_modified_at'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    orgIdIndex: index('org_id_idx').on(table.orgId),
    orgModuleIndex: uniqueIndex('org_module_idx').on(table.orgId, table.module)
  })
);

export const orgModulesRelations = relations(orgModules, ({ one }) => ({
  org: one(orgs, {
    fields: [orgModules.orgId],
    references: [orgs.id]
  }),
  lastModifiedByUser: one(users, {
    fields: [orgModules.lastModifiedByUser],
    references: [users.id]
  })
}));

export const orgPostalConfigs = mysqlTable(
  'org_postal_configs',
  {
    id: serial('id').primaryKey(),
    orgId: foreignKey('org_id').notNull(),
    host: varchar('host', { length: 32 }).notNull(),
    ipPools: json('ip_pools').notNull().$type<string[]>(),
    defaultIpPool: varchar('default_ip_pool', { length: 32 }).notNull()
  },
  (table) => ({
    orgIdIndex: index('org_id_idx').on(table.orgId)
  })
);

export const orgPostalConfigsRelations = relations(
  orgPostalConfigs,
  ({ one, many }) => ({
    org: one(orgs, {
      fields: [orgPostalConfigs.orgId],
      references: [orgs.id]
    }),
    domains: many(domains)
  })
);

// User groups
export const userGroups = mysqlTable(
  'user_groups',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    avatarId: varchar('avatar_id', { length: 64 }),
    color: mysqlEnum('color', [
      'red',
      'pink',
      'purple',
      'blue',
      'green',
      'orange',
      'yellow'
    ]),
    description: text('description'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    orgIdIndex: index('org_id_idx').on(table.orgId)
  })
);

export const userGroupsRelations = relations(userGroups, ({ one, many }) => ({
  org: one(orgs, {
    fields: [userGroups.orgId],
    references: [orgs.id]
  }),
  members: many(userGroupMembers),
  routingRules: many(emailRoutingRulesDestinations)
}));

export const userGroupMembers = mysqlTable(
  'user_group_members',
  {
    id: serial('id').primaryKey(),
    groupId: foreignKey('group_id').notNull(),
    userId: foreignKey('user_id').notNull(),
    userProfileId: foreignKey('user_profile_id'),
    addedBy: foreignKey('added_by').notNull(),
    role: mysqlEnum('role', ['member', 'admin']).notNull().default('member'),
    notifications: mysqlEnum('notifications', ['active', 'muted', 'off'])
      .notNull()
      .default('active'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    groupIdIndex: index('group_id_idx').on(table.groupId),
    userIdIndex: index('user_id_idx').on(table.userId),
    userToGroupIndex: uniqueIndex('user_to_group_idx').on(
      table.groupId,
      table.userId
    )
  })
);
export const userGroupMembersRelations = relations(
  userGroupMembers,
  ({ one, many }) => ({
    group: one(userGroups, {
      fields: [userGroupMembers.groupId],
      references: [userGroups.id]
    }),
    user: one(users, {
      fields: [userGroupMembers.userId],
      references: [users.id]
    }),
    userProfile: one(userProfiles, {
      fields: [userGroupMembers.userProfileId],
      references: [userProfiles.id]
    })
  })
);

// Domain table
export const domains = mysqlTable(
  'domains',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    postalHost: varchar('postal_host', { length: 32 }).notNull(),
    domain: varchar('domain', { length: 256 }).notNull(),
    postalId: varchar('postal_id', { length: 64 }),
    dkimKey: varchar('dkim_key', { length: 32 }),
    dkimValue: varchar('dkim_value', { length: 256 }),
    status: mysqlEnum('status', ['active', 'removed']).notNull(),
    mode: mysqlEnum('mode', ['native', 'forwarding']).notNull(), // native = all mail comes to UnInbox, forwarding = mail is forwarded from another mail system
    dnsStatus: mysqlEnum('dns_status', [
      'valid', // All DNS records are valid
      'failed', // one or more DNS records are invalid
      'pending', // DNS records are being validated
      'verified', // verification TXT record has been verified
      'unverified' // verification TXT record has not been verified
    ]).notNull(),
    statusUpdateAt: timestamp('status_updated_at'),
    lastDnsCheckAt: timestamp('last_dns_check_at'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    orgIdIndex: index('org_id_idx').on(table.orgId),
    domainIndex: uniqueIndex('domain_idx').on(table.domain),
    postalIdIndex: uniqueIndex('postal_id_idx').on(table.postalId)
  })
);
export const domainsRelations = relations(domains, ({ one }) => ({
  org: one(orgs, {
    fields: [domains.orgId],
    references: [orgs.id]
  }),
  postalConfig: one(orgPostalConfigs, {
    fields: [domains.postalHost],
    references: [orgPostalConfigs.id]
  })
}));

export const domainVerifications = mysqlTable(
  'domain_verifications',
  {
    id: serial('id').primaryKey(),
    domainId: foreignKey('domain_id').notNull(),
    verificationToken: varchar('verification_token', { length: 64 }).notNull(),
    verifiedAt: timestamp('verified_at')
  },
  (table) => ({
    domainIdIndex: uniqueIndex('domain_id_idx').on(table.domainId)
  })
);
export const domainVerificationsRelations = relations(
  domainVerifications,
  ({ one }) => ({
    domain: one(domains, {
      fields: [domainVerifications.domainId],
      references: [domains.id]
    })
  })
);

// Postal server table
export const postalServers = mysqlTable(
  'postal_servers',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    rootMailServer: boolean('root_mail_server').notNull().default(false),
    type: mysqlEnum('type', ['email', 'transactional', 'marketing']).notNull(),
    sendLimit: mediumint('send_limit').notNull(),
    apiKey: varchar('api_key', { length: 64 }).notNull(),
    smtpKey: varchar('smtp_key', { length: 64 }),
    forwardingAddress: varchar('forwarding_address', { length: 128 })
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit: when rootMailServer is true, type must be email
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit: when rootMailServer is false, smtpKey must not be null
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    orgIdIndex: index('org_id_idx').on(table.orgId),
    postalSlug: uniqueIndex('postal_slug').on(table.orgId, table.type)
  })
);
export const postalServersRelations = relations(postalServers, ({ one }) => ({
  org: one(orgs, {
    fields: [postalServers.orgId],
    references: [orgs.id]
  })
}));

// External senders and their reputations
export const foreignEmailIdentities = mysqlTable(
  'foreign_email_identities',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    rootDomain: varchar('root_domain', { length: 128 }).notNull(),
    username: varchar('username', { length: 128 }).notNull(),
    avatarId: varchar('avatar_id', { length: 64 }),
    senderName: varchar('sender_name', { length: 128 }),
    signature: text('signature'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    rootDomainIndex: index('root_domain_idx').on(table.rootDomain),
    emailIndex: uniqueIndex('email_idx').on(table.rootDomain, table.username)
  })
);

export const foreignEmailIdentitiesRelations = relations(
  foreignEmailIdentities,
  ({ one, many }) => ({
    emailIdentitiesReputations: one(foreignEmailIdentitiesReputations, {
      fields: [foreignEmailIdentities.id],
      references: [foreignEmailIdentitiesReputations.identityId]
    }),
    screenerStatuses: many(foreignEmailIdentitiesScreenerStatus)
  })
);

export const foreignEmailIdentitiesReputations = mysqlTable(
  'foreign_email_identities_reputations',
  {
    id: serial('id').primaryKey(),
    identityId: foreignKey('identity_id').notNull(),
    spam: tinyint('spam').notNull(),
    cold: tinyint('cold').notNull(),
    lastUpdated: timestamp('last_updated')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    identityIdIndex: uniqueIndex('identity_id_idx').on(table.identityId)
  })
);

export const foreignEmailIdentitiesReputationsRelations = relations(
  foreignEmailIdentitiesReputations,
  ({ one }) => ({
    identity: one(foreignEmailIdentities, {
      fields: [foreignEmailIdentitiesReputations.identityId],
      references: [foreignEmailIdentities.id]
    })
  })
);

export const foreignEmailIdentitiesScreenerStatus = mysqlTable(
  'foreign_email_identities_screener_status',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    foreignIdentityId: foreignKey('foreign_identity_id').notNull(),
    rootEmailIdentityId: foreignKey('root_email_identity_id'),
    emailIdentityId: foreignKey('email_identity_id'),
    status: mysqlEnum('status', ['pending', 'approve', 'reject', 'delete'])
      .notNull()
      .default('pending'),
    level: mysqlEnum('level', ['emailIdentity', 'user', 'org'])
      .notNull()
      .default('emailIdentity'),
    setByUserId: foreignKey('set_by_user_id').notNull(),
    lastUpdated: timestamp('last_updated')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    foreignIdentityIdIndex: index('foreignIdentity_id_idx').on(
      table.foreignIdentityId
    ),
    orgIdIndex: index('org_id_idx').on(table.orgId),
    rootEmailIdentityIdIndex: index('root_email_identity_id_idx').on(
      table.rootEmailIdentityId
    ),
    emailIdentityIdIndex: index('email_identity_id_idx').on(
      table.emailIdentityId
    ),
    foreignToInternalIndex: uniqueIndex('foreign_to_internal_idx').on(
      table.foreignIdentityId,
      table.emailIdentityId
    ),
    foreignToRootIndex: uniqueIndex('foreign_to_root_idx').on(
      table.foreignIdentityId,
      table.rootEmailIdentityId
    )
  })
);

export const foreignEmailIdentitiesScreenerStatusRelations = relations(
  foreignEmailIdentitiesScreenerStatus,
  ({ one }) => ({
    org: one(orgs, {
      fields: [foreignEmailIdentitiesScreenerStatus.orgId],
      references: [orgs.id]
    }),
    foreignIdentity: one(foreignEmailIdentities, {
      fields: [foreignEmailIdentitiesScreenerStatus.foreignIdentityId],
      references: [foreignEmailIdentities.id]
    }),
    emailIdentity: one(emailIdentities, {
      fields: [foreignEmailIdentitiesScreenerStatus.emailIdentityId],
      references: [emailIdentities.id]
    }),
    setByUser: one(users, {
      fields: [foreignEmailIdentitiesScreenerStatus.setByUserId],
      references: [users.id]
    })
  })
);

//* Send As External Email Identities

export const sendAsExternalEmailIdentities = mysqlTable(
  'send_as_external_email_identities',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    verified: boolean('verified').notNull().default(false),
    username: varchar('username', { length: 32 }).notNull(),
    domain: varchar('domain', { length: 128 }).notNull(),
    sendName: varchar('send_name', { length: 128 }),
    createdBy: foreignKey('created_by').notNull(),
    smtpCredentialsId: foreignKey('smtp_credentials_id').notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    orgIdIndex: index('org_id_idx').on(table.orgId),
    emailIndex: uniqueIndex('email_idx').on(table.username, table.domain)
  })
);
export const sendAsExternalEmailIdentitiesRelations = relations(
  sendAsExternalEmailIdentities,
  ({ one }) => ({
    org: one(orgs, {
      fields: [sendAsExternalEmailIdentities.orgId],
      references: [orgs.id]
    }),
    verification: one(sendAsExternalEmailIdentitiesVerification, {
      fields: [sendAsExternalEmailIdentities.id],
      references: [sendAsExternalEmailIdentitiesVerification.identityId]
    }),
    credentials: one(sendAsExternalEmailIdentitiesSmtpCredentials, {
      fields: [sendAsExternalEmailIdentities.smtpCredentialsId],
      references: [sendAsExternalEmailIdentitiesSmtpCredentials.id]
    })
  })
);

export const sendAsExternalEmailIdentitiesVerification = mysqlTable(
  'send_as_external_email_identities_verification',
  {
    id: serial('id').primaryKey(),
    identityId: foreignKey('identity_id').notNull(),
    verificationToken: varchar('verification_token', { length: 64 }).notNull(),
    verifiedAt: timestamp('verified_at')
  },
  (table) => ({
    identityIdIndex: uniqueIndex('identity_id_idx').on(table.identityId)
  })
);
export const sendAsExternalEmailIdentitiesVerificationRelations = relations(
  sendAsExternalEmailIdentitiesVerification,
  ({ one }) => ({
    identity: one(sendAsExternalEmailIdentities, {
      fields: [sendAsExternalEmailIdentitiesVerification.identityId],
      references: [sendAsExternalEmailIdentities.id]
    })
  })
);

export const sendAsExternalEmailIdentitiesSmtpCredentials = mysqlTable(
  'send_as_external_email_identities_smtp_credentials',
  {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 128 }).notNull(),
    password: varchar('password', { length: 128 }).notNull(),
    host: varchar('hostname', { length: 128 }).notNull(),
    port: smallint('port').notNull(),
    authMethod: mysqlEnum('auth_method', ['plain', 'login', 'cram_md5']),
    encryption: mysqlEnum('encryption', ['ssl', 'tls', 'starttls', 'none']),
    createdBy: foreignKey('created_by').notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({})
);
export const sendAsExternalEmailIdentitiesSmtpCredentialsRelations = relations(
  sendAsExternalEmailIdentitiesSmtpCredentials,
  ({ many }) => ({
    identities: many(sendAsExternalEmailIdentities)
  })
);

export const sendAsExternalEmailIdentitiesAuthorizedUsers = mysqlTable(
  'send_as_external_email_identities_authorized_users',
  {
    id: serial('id').primaryKey(),
    identityId: foreignKey('identity_id').notNull(),
    userId: foreignKey('user_id'),
    userGroupId: foreignKey('user_group_id'),
    addedBy: foreignKey('added_by').notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : userId//userGroupId
    identityIdIndex: index('identity_id_idx').on(table.identityId),
    userIdIndex: index('user_id_idx').on(table.userId),
    userGroupIdIndex: index('user_group_id_idx').on(table.userGroupId),
    userToIdentityIndex: uniqueIndex('user_to_identity_idx').on(
      table.identityId,
      table.userId
    )
  })
);
export const sendAsExternalEmailIdentitiesAuthorizedUsersRelations = relations(
  sendAsExternalEmailIdentitiesAuthorizedUsers,
  ({ one }) => ({
    identity: one(sendAsExternalEmailIdentities, {
      fields: [sendAsExternalEmailIdentitiesAuthorizedUsers.identityId],
      references: [sendAsExternalEmailIdentities.id]
    }),
    user: one(users, {
      fields: [sendAsExternalEmailIdentitiesAuthorizedUsers.userId],
      references: [users.id]
    }),
    userGroup: one(userGroups, {
      fields: [sendAsExternalEmailIdentitiesAuthorizedUsers.userGroupId],
      references: [userGroups.id]
    })
  })
);

//* native Email Identities

export const emailRoutingRules = mysqlTable(
  'email_routing_rules',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description'),
    createdBy: foreignKey('created_by').notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    orgIdIndex: index('org_id_idx').on(table.orgId),
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId)
  })
);

export const emailRoutingRulesRelations = relations(
  emailRoutingRules,
  ({ one, many }) => ({
    org: one(orgs, {
      fields: [emailRoutingRules.orgId],
      references: [orgs.id]
    }),
    createdByUser: one(users, {
      fields: [emailRoutingRules.createdBy],
      references: [users.id]
    }),
    mailIdentities: many(emailIdentities),
    destination: many(emailRoutingRulesDestinations)
  })
);

export const emailRoutingRulesDestinations = mysqlTable(
  'email_routing_rules_destinations',
  {
    id: serial('id').primaryKey(),
    ruleId: foreignKey('rule_id').notNull(),
    groupId: foreignKey('group_id'),
    userId: foreignKey('user_id'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : userId//userGroupId
  })
);
export const emailRoutingRulesDestinationsRelations = relations(
  emailRoutingRulesDestinations,
  ({ one }) => ({
    rule: one(emailRoutingRules, {
      fields: [emailRoutingRulesDestinations.ruleId],
      references: [emailRoutingRules.id]
    }),
    group: one(userGroups, {
      fields: [emailRoutingRulesDestinations.groupId],
      references: [userGroups.id]
    }),
    user: one(users, {
      fields: [emailRoutingRulesDestinations.userId],
      references: [users.id]
    })
  })
);

export const emailIdentities = mysqlTable(
  'email_identities',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    username: varchar('username', { length: 32 }).notNull(),
    domainName: varchar('domain_name', { length: 128 }).notNull(),
    domainId: foreignKey('domain_id'),
    routingRuleId: foreignKey('routing_rule_id').notNull(),
    sendName: varchar('send_name', { length: 128 }),
    avatarId: varchar('avatar_id', { length: 64 }),
    createdBy: foreignKey('created_by').notNull(),
    isCatchAll: boolean('is_catch_all').notNull().default(false),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : !domainId && !catchAll - cant be catchall on root domains
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    domainIdIndex: index('domain_id_idx').on(table.domainId),
    domainNameIndex: index('domain_id_idx').on(table.domainName),
    orgIdIndex: index('org_id_idx').on(table.orgId),
    emailIndex: uniqueIndex('email_idx').on(table.username, table.domainName)
  })
);

export const emailIdentitiesRelations = relations(
  emailIdentities,
  ({ one, many }) => ({
    createdBy: one(users, {
      fields: [emailIdentities.createdBy],
      references: [users.id]
    }),
    org: one(orgs, {
      fields: [emailIdentities.orgId],
      references: [orgs.id]
    }),
    domain: one(domains, {
      fields: [emailIdentities.domainId],
      references: [domains.id]
    }),
    authorizedUsers: many(emailIdentitiesAuthorizedUsers),
    routingRules: one(emailRoutingRules, {
      fields: [emailIdentities.routingRuleId],
      references: [emailRoutingRules.id]
    })
  })
);

export const emailIdentitiesAuthorizedUsers = mysqlTable(
  'email_identities_authorized_users',
  {
    id: serial('id').primaryKey(),
    identityId: foreignKey('identity_id').notNull(),
    userId: foreignKey('user_id'),
    userGroupId: foreignKey('user_group_id'),
    addedBy: foreignKey('added_by').notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : userId//userGroupId
    identityIdIndex: index('identity_id_idx').on(table.identityId),
    userToIdentityIndex: uniqueIndex('user_to_identity_idx').on(
      table.identityId,
      table.userId
    ),
    userGroupToIdentityIndex: uniqueIndex('user_group_to_identity_idx').on(
      table.identityId,
      table.userGroupId
    )
  })
);

export const emailIdentitiesAuthorizedUsersRelations = relations(
  emailIdentitiesAuthorizedUsers,
  ({ one }) => ({
    identity: one(emailIdentities, {
      fields: [emailIdentitiesAuthorizedUsers.identityId],
      references: [emailIdentities.id]
    }),
    user: one(users, {
      fields: [emailIdentitiesAuthorizedUsers.userId],
      references: [users.id]
    }),
    userGroup: one(userGroups, {
      fields: [emailIdentitiesAuthorizedUsers.userGroupId],
      references: [userGroups.id]
    })
  })
);

//conversation tables
export const convos = mysqlTable(
  'convos',
  {
    id: serial('id').primaryKey(),
    orgId: foreignKey('org_id').notNull(),
    publicId: nanoId('public_id').notNull(),
    lastUpdatedAt: timestamp('last_updated_at'),
    lastMessageId: foreignKey('last_message_id'),
    lastNoteId: foreignKey('last_note_id'),
    screenerStatus: mysqlEnum('screener_status', [
      'pending',
      'approved',
      'rejected',
      'deleted'
    ])
      .notNull()
      .default('approved'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    orgIdIndex: index('org_id_idx').on(table.orgId),
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId)
  })
);
export const convosRelations = relations(convos, ({ one, many }) => ({
  org: one(orgs, {
    fields: [convos.orgId],
    references: [orgs.id]
  }),
  lastMessageId: one(convoMessages, {
    fields: [convos.lastMessageId],
    references: [convoMessages.id]
  }),
  lastNoteId: one(convoNotes, {
    fields: [convos.lastNoteId],
    references: [convoNotes.id]
  }),
  members: many(convoMembers),
  attachments: many(convoAttachments),
  messages: many(convoMessages),
  notes: many(convoNotes),
  drafts: many(convoDrafts),
  subjects: many(convoSubjects)
}));

export const convoSubjects = mysqlTable(
  'convo_subjects',
  {
    id: serial('id').primaryKey(),
    convoId: foreignKey('convo_id').notNull(),
    subject: varchar('subject', { length: 256 }).notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    convoIdIndex: index('convo_id_idx').on(table.convoId)
  })
);
export const convoSubjectsRelations = relations(convoSubjects, ({ one }) => ({
  convo: one(convos, {
    fields: [convoSubjects.convoId],
    references: [convos.id]
  })
}));

export const convoMembers = mysqlTable(
  'convo_members',
  {
    id: serial('id').primaryKey(),
    userId: foreignKey('user_id'),
    userProfileId: foreignKey('user_profile_id'),
    userGroupId: foreignKey('user_group_id'),
    foreignEmailIdentityId: foreignKey('foreign_email_identities_id'),
    convoId: foreignKey('convo_id').notNull(),
    role: mysqlEnum('role', ['assigned', 'contributor', 'watcher', 'guest'])
      .notNull()
      .default('contributor'),
    notifications: mysqlEnum('notifications', ['active', 'muted', 'off'])
      .notNull()
      .default('active'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : userId//userGroupId
    userIdIndex: index('user_id_idx').on(table.userId),
    convoIdIndex: index('convo_id_idx').on(table.convoId),
    userToConvoIndex: uniqueIndex('user_to_convo_idx').on(
      table.convoId,
      table.userId
    ),
    userGroupToConvoIndex: uniqueIndex('user_group_to_convo_idx').on(
      table.convoId,
      table.userGroupId
    )
  })
);
export const convoMembersRelations = relations(convoMembers, ({ one }) => ({
  user: one(users, {
    fields: [convoMembers.userId],
    references: [users.id]
  }),
  userProfile: one(userProfiles, {
    fields: [convoMembers.userProfileId],
    references: [userProfiles.id]
  }),
  userGroup: one(userGroups, {
    fields: [convoMembers.userGroupId],
    references: [userGroups.id]
  }),
  foreignEmailIdentity: one(foreignEmailIdentities, {
    fields: [convoMembers.foreignEmailIdentityId],
    references: [foreignEmailIdentities.id]
  }),
  convo: one(convos, {
    fields: [convoMembers.convoId],
    references: [convos.id]
  })
}));

export const convoAttachments = mysqlTable(
  'convo_attachments',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    convoId: foreignKey('convo_id').notNull(),
    convoMessageId: foreignKey('convo_message_id'),
    convoNoteId: foreignKey('convo_note_id'),
    convoDraftId: foreignKey('convo_draft_id'),
    fileName: varchar('fileName', { length: 256 }).notNull(),
    type: varchar('type', { length: 256 }).notNull(),
    storageId: varchar('storageId', { length: 256 }).notNull(),
    convoMemberId: foreignKey('convo_members').notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    convoIdIndex: index('convo_id_idx').on(table.convoId),
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId)
  })
);
export const convoAttachmentsRelations = relations(
  convoAttachments,
  ({ one }) => ({
    convo: one(convos, {
      fields: [convoAttachments.convoId],
      references: [convos.id]
    }),
    convoMessage: one(convoMessages, {
      fields: [convoAttachments.convoMessageId],
      references: [convoMessages.id]
    }),
    uploader: one(convoMembers, {
      fields: [convoAttachments.convoMemberId],
      references: [convoMembers.id]
    }),
    convoNote: one(convoNotes, {
      fields: [convoAttachments.convoNoteId],
      references: [convoNotes.id]
    }),
    convoDraft: one(convoDrafts, {
      fields: [convoAttachments.convoDraftId],
      references: [convoDrafts.id]
    })
  })
);

export const convoMessages = mysqlTable(
  'convo_messages',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    convoId: foreignKey('convo_id').notNull(),
    subjectId: foreignKey('subject_id'),
    replyToId: foreignKey('reply_to_id'),
    author: foreignKey('convo_members').notNull(),
    body: text('body'),
    postalMessageId: varchar('postal_message_id', { length: 256 }),
    postalId: bigintUnsigned('postal_id'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    convoIdIndex: index('convo_id_idx').on(table.convoId),
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId)
  })
);
export const convoMessagesRelations = relations(
  convoMessages,
  ({ one, many }) => ({
    convo: one(convos, {
      fields: [convoMessages.convoId],
      references: [convos.id]
    }),
    subject: one(convoSubjects, {
      fields: [convoMessages.subjectId],
      references: [convoSubjects.id]
    }),
    author: one(convoMembers, {
      fields: [convoMessages.author],
      references: [convoMembers.id]
    }),
    attachments: many(convoAttachments),
    replies: many(convoMessageReplies, {
      relationName: 'replies'
    }),
    replyTo: one(convoMessageReplies, {
      fields: [convoMessages.replyToId],
      references: [convoMessageReplies.convoMessageSourceId],
      relationName: 'inReplyTo'
    }),
    draftReplies: many(convoMessageReplies, { relationName: 'draftReplies' })
  })
);

export const convoMessageReplies = mysqlTable(
  'convo_message_replies',
  {
    id: serial('id').primaryKey(),
    convoMessageSourceId: foreignKey('convo_message_source_id').notNull(),
    convoMessageReplyId: foreignKey('convo_message_reply_id'),
    convoDraftId: foreignKey('convo_draft_id'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : convoMessageReplyId//convoDraftId
    //TODO: Add indexes
  })
);

export const convoMessageRepliesRelations = relations(
  convoMessageReplies,
  ({ one }) => ({
    convoMessageSource: one(convoMessages, {
      fields: [convoMessageReplies.convoMessageSourceId],
      references: [convoMessages.id],
      relationName: 'inReplyTo'
    }),
    convoMessageReply: one(convoMessages, {
      fields: [convoMessageReplies.convoMessageReplyId],
      references: [convoMessages.id],
      relationName: 'replies'
    }),
    convoDraft: one(convoDrafts, {
      fields: [convoMessageReplies.convoMessageReplyId],
      references: [convoDrafts.id],
      relationName: 'draftReplies'
    })
  })
);

export const convoNotes = mysqlTable(
  'convo_notes',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    convoId: foreignKey('convo_id').notNull(),
    replyToId: foreignKey('reply_to_id'),
    author: foreignKey('convo_members').notNull(),
    visibility: mysqlEnum('visibility', ['self', 'convo', 'org', 'public'])
      .notNull()
      .default('convo'),
    body: text('body'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    convoIdIndex: index('convo_id_idx').on(table.convoId),
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId)
  })
);
export const convoNotesRelations = relations(convoNotes, ({ one, many }) => ({
  convo: one(convos, {
    fields: [convoNotes.convoId],
    references: [convos.id]
  }),
  author: one(convoMembers, {
    fields: [convoNotes.author],
    references: [convoMembers.id]
  }),
  attachments: many(convoAttachments),
  replies: many(convoNoteReplies, {
    relationName: 'replies'
  }),
  replyTo: one(convoNoteReplies, {
    fields: [convoNotes.replyToId],
    references: [convoNoteReplies.convoNoteSourceId],
    relationName: 'inReplyTo'
  })
}));

export const convoNoteReplies = mysqlTable(
  'convo_Note_replies',
  {
    id: serial('id').primaryKey(),
    convoNoteSourceId: foreignKey('convo_Note_source_id').notNull(),
    convoNoteReplyId: foreignKey('convo_Note_reply_id'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : convoNoteReplyId//convoDraftId
    //TODO: Add indexes
  })
);

export const convoNoteRepliesRelations = relations(
  convoNoteReplies,
  ({ one }) => ({
    convoNoteSource: one(convoNotes, {
      fields: [convoNoteReplies.convoNoteSourceId],
      references: [convoNotes.id],
      relationName: 'inReplyTo'
    }),
    convoNoteReply: one(convoNotes, {
      fields: [convoNoteReplies.convoNoteReplyId],
      references: [convoNotes.id],
      relationName: 'replies'
    })
  })
);

export const convoDrafts = mysqlTable(
  'convo_drafts',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    convoId: foreignKey('convo_id').notNull(),
    replyToId: foreignKey('reply_to_id'),
    author: foreignKey('author').notNull(),
    visibility: mysqlEnum('visibility', ['self', 'convo', 'org', 'public'])
      .notNull()
      .default('self'),
    body: text('body'),

    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    convoIdIndex: index('convo_id_idx').on(table.convoId),
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId)
  })
);
export const convoDraftsRelations = relations(convoDrafts, ({ one, many }) => ({
  convo: one(convos, {
    fields: [convoDrafts.convoId],
    references: [convos.id]
  }),
  author: one(convoMembers, {
    fields: [convoDrafts.author],
    references: [convoMembers.id]
  }),
  attachments: many(convoAttachments),
  replyTo: one(convoMessages, {
    fields: [convoDrafts.replyToId],
    references: [convoMessages.id]
  })
}));
