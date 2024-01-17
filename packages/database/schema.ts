import {
  int,
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
import type { AdapterAccount } from '@auth/core/adapters';
import { nanoIdLength, nanoIdLongLength } from '@uninbox/utils';
import { uiColors } from '@uninbox/types/ui';
import {
  stripeBillingPeriods,
  stripePlanNames
} from '../../ee/apps/billing/types';

//TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit

// These custom types support incompatibilities with drizzle-orm or types that must remain in sync across db

// Custom nanoId type = easy increase length later - used as "publicId: nanoId('public_id')
const nanoId = customType<{ data: string; notNull: true }>({
  dataType() {
    return `varchar(${nanoIdLength})`;
  }
});
const nanoIdLong = customType<{ data: string; notNull: true }>({
  dataType() {
    return `varchar(${nanoIdLongLength})`;
  }
});

// Foreign Key type as drizzle does not support unsigned bigint
const foreignKey = customType<{ data: number }>({
  dataType() {
    return 'bigint unsigned';
  }
});

const bigintUnsigned = customType<{ data: number }>({
  dataType() {
    return 'bigint unsigned';
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
    metadata: json('metadata').$type<Record<string, unknown>>(),
    emailVerified: timestamp('emailVerified', {
      mode: 'date',
      fsp: 3
    }).defaultNow(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    usernameIndex: uniqueIndex('username_idx').on(table.username),
    recoveryEmailIndex: uniqueIndex('recovery_email_idx').on(
      table.recoveryEmail
    )
  })
);

export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  orgMemberships: many(orgMembers),
  profiles: many(userProfiles),
  defaultProfile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId]
  }),
  personalEmailIdentities: many(personalEmailIdentities)
}));

// Auth tables
export const accounts = mysqlTable(
  'accounts',
  {
    id: serial('id').primaryKey(),
    userId: foreignKey('userId').notNull(),
    type: varchar('type', { length: 255 })
      .$type<AdapterAccount['type']>()
      .notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
    expires_at: int('expires_at')
  },
  (account) => ({
    providerIndex: index('provider_idx').on(account.provider),
    providerAccountIdIndex: uniqueIndex('provider_account_id_idx').on(
      account.providerAccountId
    ),
    userIdProviderIndex: uniqueIndex('user_id_provider_idx').on(
      account.userId,
      account.provider
    )
  })
);

export const accountRelationships = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  }),
  authenticators: many(authenticators)
}));

export const authenticators = mysqlTable(
  'authenticators',
  {
    id: serial('id').primaryKey(),
    providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
    credentialID: varchar('credentialID', { length: 255 }).notNull(),
    credentialPublicKey: varchar('credentialPublicKey', {
      length: 255
    }).notNull(),
    counter: int('counter').notNull(),
    credentialDeviceType: mysqlEnum('credentialDeviceType', [
      'singleDevice',
      'multiDevice'
    ]).notNull(),
    credentialBackedUp: boolean('credentialBackedUp').notNull(),
    transports:
      json('transports').$type<
        ('ble' | 'hybrid' | 'internal' | 'nfc' | 'usb')[]
      >()
  },
  (table) => ({
    providerAccountIdIndex: index('provider_account_id_idx').on(
      table.providerAccountId
    ),
    credentialIDIndex: uniqueIndex('credential_id_idx').on(table.credentialID)
  })
);

export const authenticatorRelationships = relations(
  authenticators,
  ({ one }) => ({
    account: one(accounts, {
      fields: [authenticators.providerAccountId],
      references: [accounts.providerAccountId]
    })
  })
);

export const sessions = mysqlTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    userId: varchar('userId', { length: 255 }).notNull(),
    sessionToken: varchar('sessionToken', { length: 255 }).notNull(),
    device: varchar('device', { length: 255 }).notNull(),
    browser: varchar('browser', { length: 255 }).notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull()
  },
  (table) => ({
    userIdIndex: index('user_id_idx').on(table.userId),
    sessionTokenIndex: uniqueIndex('session_token_idx').on(table.sessionToken)
  })
);
export const sessionRelationships = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

// // Identity table (user logins)
// export const userAuthIdentities = mysqlTable(
//   'user_identities',
//   {
//     id: serial('id').primaryKey(),
//     userId: foreignKey('user_id').notNull(),
//     provider: varchar('provider', { length: 32 }).notNull(),
//     providerId: varchar('provider_id', { length: 64 }).notNull(),
//     createdAt: timestamp('created_at')
//       .default(sql`CURRENT_TIMESTAMP`)
//       .notNull()
//   },
//   (table) => ({
//     providerProviderIdIndex: uniqueIndex('provider_provider_id_idx').on(
//       table.provider,
//       table.providerId
//     ),
//     userIdProviderIndex: uniqueIndex('user_id_provider_idx').on(
//       table.userId,
//       table.provider
//     ),
//     providerIdIndex: index('provider_id_idx').on(table.providerId)
//   })
// );
// export const userAuthIdentitiesRelations = relations(
//   userAuthIdentities,
//   ({ one }) => ({
//     user: one(users, {
//       fields: [userAuthIdentities.userId],
//       references: [users.id]
//     })
//   })
// );

export const userProfiles = mysqlTable(
  'user_profiles',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    userId: foreignKey('user_id'),
    firstName: varchar('first_name', { length: 64 }),
    lastName: varchar('last_name', { length: 64 }),
    handle: varchar('handle', { length: 64 }),
    title: varchar('title', { length: 64 }),
    blurb: text('blurb'),
    defaultProfile: boolean('default_profile').notNull().default(false),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    userIdIndex: index('user_id_idx').on(table.userId)
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
    slug: varchar('slug', { length: 64 }).notNull(),
    ownerId: foreignKey('owner_id').notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    metadata: json('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    slugIndex: uniqueIndex('slug_idx').on(table.slug)
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

// changes to status and role must be reflected in types OrgContext
export const orgMembers = mysqlTable(
  'org_members',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    userId: foreignKey('user_id'),
    orgId: foreignKey('org_id').notNull(),
    invitedByOrgMemberId: foreignKey('invited_by_org_member_id'),
    status: mysqlEnum('status', ['invited', 'active', 'removed']).notNull(),
    role: mysqlEnum('role', ['member', 'admin']).notNull(),
    userProfileId: foreignKey('user_profile_id').notNull(),
    addedAt: timestamp('added_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    removedAt: timestamp('removed_at')
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    userIdIndex: index('user_id_idx').on(table.userId),
    orgIdIndex: index('org_id_idx').on(table.orgId),
    orgUserIndex: uniqueIndex('org_user_idx').on(table.orgId, table.userId)
  })
);
export const orgMembersRelations = relations(orgMembers, ({ one, many }) => ({
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
  }),
  routingRules: many(emailRoutingRulesDestinations)
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
    invitedByOrgMemberId: foreignKey('invited_by_org_member_id').notNull(),
    role: mysqlEnum('role', ['member', 'admin']).notNull(),
    orgMemberId: foreignKey('org_member_id'),
    invitedUserProfileId: foreignKey('invited_user_profile_id'),
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
    orgMemberIdIndex: uniqueIndex('org_member_id_idx').on(table.orgMemberId),
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
  invitedByOrgMember: one(orgMembers, {
    fields: [orgInvitations.invitedByOrgMemberId],
    references: [orgMembers.id]
  }),
  orgMember: one(orgMembers, {
    fields: [orgInvitations.orgMemberId],
    references: [orgMembers.id]
  }),
  invitedProfile: one(userProfiles, {
    fields: [orgInvitations.invitedUserProfileId],
    references: [userProfiles.id]
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
    color: mysqlEnum('color', [...uiColors]),
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
    publicId: nanoId('public_id').notNull(),
    groupId: foreignKey('group_id').notNull(),
    orgMemberId: foreignKey('org_member_id').notNull(),
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
    orgMemberIdIndex: index('user_id_idx').on(table.orgMemberId),
    userToGroupIndex: uniqueIndex('user_to_group_idx').on(
      table.groupId,
      table.orgMemberId
    )
  })
);
export const userGroupMembersRelations = relations(
  userGroupMembers,
  ({ one }) => ({
    group: one(userGroups, {
      fields: [userGroupMembers.groupId],
      references: [userGroups.id]
    }),
    orgMember: one(orgMembers, {
      fields: [userGroupMembers.orgMemberId],
      references: [orgMembers.id]
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
    catchAllAddress: foreignKey('catch_all_address'),
    postalHost: varchar('postal_host', { length: 32 }).notNull(),
    domain: varchar('domain', { length: 256 }).notNull(),
    forwardingAddress: varchar('forwarding_address', { length: 128 }),
    postalId: varchar('postal_id', { length: 64 }),
    domainStatus: mysqlEnum('domain_status', ['pending', 'active', 'disabled'])
      .notNull()
      .default('pending'),
    sendingMode: mysqlEnum('sending_mode', [
      'native',
      'external',
      'disabled'
    ]).notNull(),
    receivingMode: mysqlEnum('receiving_mode', [
      'native',
      'forwarding',
      'disabled'
    ]).notNull(),
    dkimKey: varchar('dkim_key', { length: 32 }),
    dkimValue: varchar('dkim_value', { length: 256 }),
    mxDnsValid: boolean('mx_dns_valid').notNull().default(false),
    dkimDnsValid: boolean('dkim_dns_valid').notNull().default(false),
    spfDnsValid: boolean('spf_dns_valid').notNull().default(false),
    returnPathDnsValid: boolean('return_path_dns_valid')
      .notNull()
      .default(false),
    lastDnsCheckAt: timestamp('last_dns_check_at'),
    disabledAt: timestamp('disabled_at'),
    verifiedAt: timestamp('verified_at'),
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
  }),
  catchAllAddress: one(emailIdentities, {
    fields: [domains.catchAllAddress],
    references: [emailIdentities.id]
  })
}));

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
    rootForwardingAddress: varchar('root_forwarding_address', { length: 128 })
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit: when rootMailServer is true, type must be email
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit: when rootMailServer is false, smtpKey must not be null
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit: when rootMailServer is false, rootForwardingAddress must be null
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    orgIdIndex: index('org_id_idx').on(table.orgId)
  })
);
export const postalServersRelations = relations(postalServers, ({ one }) => ({
  org: one(orgs, {
    fields: [postalServers.orgId],
    references: [orgs.id]
  })
}));

//* Contacts

// TODO: Add email generated column when supported in Drizzle-orm: https://github.com/drizzle-team/drizzle-orm/pull/1471

export const contacts = mysqlTable(
  'contacts',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    reputationId: foreignKey('reputation_id').notNull(),
    name: varchar('name', { length: 128 }),
    setName: varchar('set_name', { length: 128 }),
    emailUsername: varchar('email_username', { length: 128 }).notNull(),
    emailDomain: varchar('email_domain', { length: 128 }).notNull(),
    signature: text('signature'),
    type: mysqlEnum('type', [
      'person',
      'product',
      'newsletter',
      'marketing'
    ]).notNull(),
    screenerStatus: mysqlEnum('screener_status', [
      'pending',
      'approve',
      'reject'
    ]),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    orgIdIndex: index('org_id_idx').on(table.orgId),
    emailIndex: index('email_idx').on(table.emailUsername, table.emailDomain),
    emailOrgUniqueIndex: uniqueIndex('email_org_unique_idx').on(
      table.emailUsername,
      table.emailDomain,
      table.orgId
    )
  })
);

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  org: one(orgs, {
    fields: [contacts.orgId],
    references: [orgs.id]
  }),
  convoParticipants: many(convoParticipants),
  reputation: one(contactGlobalReputations, {
    fields: [contacts.reputationId],
    references: [contactGlobalReputations.id]
  })
}));

export const contactGlobalReputations = mysqlTable(
  'contact_global_reputations',
  {
    id: serial('id').primaryKey(),
    emailAddress: varchar('email_address', { length: 128 }).notNull(),
    spam: tinyint('spam').notNull().default(0),
    cold: tinyint('cold').notNull().default(0),
    newsletter: tinyint('newsletter').notNull().default(0),
    marketing: tinyint('marketing').notNull().default(0),
    product: tinyint('product').notNull().default(0),
    messageCount: mediumint('message_count').notNull().default(0),
    lastUpdated: timestamp('last_updated')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    emailAddressIndex: uniqueIndex('email_address_idx').on(table.emailAddress)
  })
);

export const contactGlobalReputationsRelations = relations(
  contactGlobalReputations,
  ({ many }) => ({
    contacts: many(contacts)
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
    orgMemberId: foreignKey('org_member_id'),
    userGroupId: foreignKey('user_group_id'),
    addedBy: foreignKey('added_by').notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : userId//userGroupId
    identityIdIndex: index('identity_id_idx').on(table.identityId),
    orgMemberIdIndex: index('org_member_id_idx').on(table.orgMemberId),
    userGroupIdIndex: index('user_group_id_idx').on(table.userGroupId),
    orgMemberToIdentityIndex: uniqueIndex('org_member_to_identity_idx').on(
      table.identityId,
      table.orgMemberId
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
    orgMember: one(orgMembers, {
      fields: [sendAsExternalEmailIdentitiesAuthorizedUsers.orgMemberId],
      references: [orgMembers.id]
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
    destinations: many(emailRoutingRulesDestinations)
  })
);

export const emailRoutingRulesDestinations = mysqlTable(
  'email_routing_rules_destinations',
  {
    id: serial('id').primaryKey(),
    orgId: foreignKey('org_id').notNull(),
    ruleId: foreignKey('rule_id').notNull(),
    groupId: foreignKey('group_id'),
    orgMemberId: foreignKey('org_member_id'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    orgIdIndex: index('org_id_idx').on(table.orgId)
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : userId//userGroupId
  })
);
export const emailRoutingRulesDestinationsRelations = relations(
  emailRoutingRulesDestinations,
  ({ one }) => ({
    org: one(orgs, {
      fields: [emailRoutingRulesDestinations.orgId],
      references: [orgs.id]
    }),
    rule: one(emailRoutingRules, {
      fields: [emailRoutingRulesDestinations.ruleId],
      references: [emailRoutingRules.id]
    }),
    group: one(userGroups, {
      fields: [emailRoutingRulesDestinations.groupId],
      references: [userGroups.id]
    }),
    orgMember: one(orgMembers, {
      fields: [emailRoutingRulesDestinations.orgMemberId],
      references: [orgMembers.id]
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
    createdBy: foreignKey('created_by').notNull(),
    isCatchAll: boolean('is_catch_all').notNull().default(false),
    isPersonal: boolean('is_personal').notNull().default(false),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : !domainId && !catchAll - cant be catchall on root domains || catchAll && domainId - Single domain can only have one catch all email address
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
    orgId: foreignKey('org_id').notNull(),
    identityId: foreignKey('identity_id').notNull(),
    orgMemberId: foreignKey('org_member_id'),
    userGroupId: foreignKey('user_group_id'),
    default: boolean('default').notNull().default(false),
    addedBy: foreignKey('added_by').notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : userId//userGroupId, userId//default, userGroupId//default
    orgIdIndex: index('org_id_idx').on(table.orgId),
    identityIdIndex: index('identity_id_idx').on(table.identityId),
    orgMemberToIdentityIndex: uniqueIndex('org_member_to_identity_idx').on(
      table.identityId,
      table.orgMemberId
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
    org: one(orgs, {
      fields: [emailIdentitiesAuthorizedUsers.orgId],
      references: [orgs.id]
    }),
    identity: one(emailIdentities, {
      fields: [emailIdentitiesAuthorizedUsers.identityId],
      references: [emailIdentities.id]
    }),
    orgMember: one(orgMembers, {
      fields: [emailIdentitiesAuthorizedUsers.orgMemberId],
      references: [orgMembers.id]
    }),
    userGroup: one(userGroups, {
      fields: [emailIdentitiesAuthorizedUsers.userGroupId],
      references: [userGroups.id]
    })
  })
);

export const personalEmailIdentities = mysqlTable(
  'personal_email_identities',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    userId: foreignKey('user_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    emailIdentityId: foreignKey('email_identity_id').notNull(),
    postalServerId: foreignKey('postal_server_id').notNull(),
    forwardingAddress: varchar('forwarding_address', { length: 128 }),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    userIdIndex: index('user_id_idx').on(table.userId),
    orgIdIndex: index('org_id_idx').on(table.orgId),
    emailIdentityIdIndex: index('email_identity_id_idx').on(
      table.emailIdentityId
    )
  })
);

export const personalEmailIdentitiesRelations = relations(
  personalEmailIdentities,
  ({ one }) => ({
    user: one(users, {
      fields: [personalEmailIdentities.userId],
      references: [users.id]
    }),
    org: one(orgs, {
      fields: [personalEmailIdentities.orgId],
      references: [orgs.id]
    }),
    emailIdentity: one(emailIdentities, {
      fields: [personalEmailIdentities.emailIdentityId],
      references: [emailIdentities.id]
    }),
    postalServer: one(postalServers, {
      fields: [personalEmailIdentities.postalServerId],
      references: [postalServers.id]
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
  members: many(convoParticipants),
  attachments: many(convoAttachments),
  entries: many(convoEntries),
  subjects: many(convoSubjects)
}));

export const convoSubjects = mysqlTable(
  'convo_subjects',
  {
    id: serial('id').primaryKey(),
    orgId: foreignKey('org_id').notNull(),
    publicId: nanoId('public_id').notNull(),
    convoId: foreignKey('convo_id').notNull(),
    subject: varchar('subject', { length: 256 }).notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    orgIdIndex: index('org_id_idx').on(table.orgId),
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    convoIdIndex: index('convo_id_idx').on(table.convoId)
  })
);
export const convoSubjectsRelations = relations(convoSubjects, ({ one }) => ({
  org: one(orgs, {
    fields: [convoSubjects.orgId],
    references: [orgs.id]
  }),
  convo: one(convos, {
    fields: [convoSubjects.convoId],
    references: [convos.id]
  })
}));

export const convoParticipants = mysqlTable(
  'convo_participants',
  {
    id: serial('id').primaryKey(),
    orgId: foreignKey('org_id').notNull(),
    publicId: nanoId('public_id').notNull(),
    orgMemberId: foreignKey('org_member_id'),
    userGroupId: foreignKey('user_group_id'),
    contactId: foreignKey('contact_id'),
    convoId: foreignKey('convo_id').notNull(),
    role: mysqlEnum('role', [
      'assigned',
      'contributor',
      'commenter',
      'watcher',
      'guest'
    ]) // Assigned/Contributor will be added to email CCs - other roles will not
      .notNull()
      .default('contributor'),
    notifications: mysqlEnum('notifications', ['active', 'muted', 'off'])
      .notNull()
      .default('active'),
    lastReadAt: timestamp('last_read_at'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: add support for Check constraints when implemented in drizzle-orm & drizzle-kit : userId//userGroupId
    orgIdIndex: index('org_id_idx').on(table.orgId),
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    orgMemberIdIndex: index('user_id_idx').on(table.orgMemberId),
    convoIdIndex: index('convo_id_idx').on(table.convoId),
    orgMemberToConvoIndex: uniqueIndex('org_member_to_convo_idx').on(
      table.convoId,
      table.orgMemberId
    ),
    userGroupToConvoIndex: uniqueIndex('user_group_to_convo_idx').on(
      table.convoId,
      table.userGroupId
    )
  })
);
export const convoParticipantsRelations = relations(
  convoParticipants,
  ({ one }) => ({
    org: one(orgs, {
      fields: [convoParticipants.orgId],
      references: [orgs.id]
    }),
    orgMember: one(orgMembers, {
      fields: [convoParticipants.orgMemberId],
      references: [orgMembers.id]
    }),
    userGroup: one(userGroups, {
      fields: [convoParticipants.userGroupId],
      references: [userGroups.id]
    }),
    contact: one(contacts, {
      fields: [convoParticipants.contactId],
      references: [contacts.id]
    }),
    convo: one(convos, {
      fields: [convoParticipants.convoId],
      references: [convos.id]
    })
  })
);

export const convoAttachments = mysqlTable(
  'convo_attachments',
  {
    id: serial('id').primaryKey(),
    orgId: foreignKey('org_id').notNull(),
    publicId: nanoId('public_id').notNull(),
    convoId: foreignKey('convo_id').notNull(),
    convoEntryId: foreignKey('convo_entry_id'),
    fileName: varchar('fileName', { length: 256 }).notNull(),
    type: varchar('type', { length: 256 }).notNull(),
    storageId: varchar('storageId', { length: 256 }).notNull(),
    convoMemberId: foreignKey('convo_members').notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    orgIdIndex: index('org_id_idx').on(table.orgId),
    convoIdIndex: index('convo_id_idx').on(table.convoId),
    convoEntryIdIndex: index('convo_entry_id_idx').on(table.convoEntryId),
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId)
  })
);
export const convoAttachmentsRelations = relations(
  convoAttachments,
  ({ one }) => ({
    org: one(orgs, {
      fields: [convoAttachments.orgId],
      references: [orgs.id]
    }),
    convo: one(convos, {
      fields: [convoAttachments.convoId],
      references: [convos.id]
    }),
    convoEntry: one(convoEntries, {
      fields: [convoAttachments.convoEntryId],
      references: [convoEntries.id]
    }),
    uploader: one(convoParticipants, {
      fields: [convoAttachments.convoMemberId],
      references: [convoParticipants.id]
    })
  })
);

export type ConvoEntryMetadataEmail = {
  postalMessageId: string;
  postalMessages: {
    recipient: string;
    id: number;
    token: string;
  }[];
  emailHeaders?: string;
};
export type ConvoEntryMetadata = {
  email?: ConvoEntryMetadataEmail;
};

export const convoEntries = mysqlTable(
  'convo_entries',
  {
    id: serial('id').primaryKey(),
    orgId: foreignKey('org_id').notNull(),
    publicId: nanoIdLong('public_id').notNull(),
    type: mysqlEnum('type', ['message', 'comment', 'draft']).notNull(),
    convoId: foreignKey('convo_id').notNull(),
    subjectId: foreignKey('subject_id'),
    author: foreignKey('author').notNull(),
    replyToId: foreignKey('reply_to_id'),
    body: json('body').notNull(),
    bodyPlainText: text('body_plain_text').notNull(),
    metadata: json('metadata').$type<ConvoEntryMetadata>().default({}),
    visibility: mysqlEnum('visibility', [
      'private',
      'internal_participants',
      'org',
      'all_participants'
    ]).notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    orgIdIndex: index('org_id_idx').on(table.orgId),
    convoIdIndex: index('convo_id_idx').on(table.convoId),
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    typeIndex: index('type_idx').on(table.type),
    replyToIdIndex: index('reply_to_id_idx').on(table.replyToId)
  })
);

export const convoEntriesRelations = relations(
  convoEntries,
  ({ one, many }) => ({
    org: one(orgs, {
      fields: [convoEntries.orgId],
      references: [orgs.id]
    }),
    convo: one(convos, {
      fields: [convoEntries.convoId],
      references: [convos.id]
    }),
    subject: one(convoSubjects, {
      fields: [convoEntries.subjectId],
      references: [convoSubjects.id]
    }),
    author: one(convoParticipants, {
      fields: [convoEntries.author],
      references: [convoParticipants.id]
    }),
    attachments: many(convoAttachments),
    replies: many(convoEntryReplies, {
      relationName: 'replies'
    }),
    replyTo: one(convoEntryReplies, {
      fields: [convoEntries.replyToId],
      references: [convoEntryReplies.entrySourceId],
      relationName: 'inReplyTo'
    })
  })
);

export const convoEntryReplies = mysqlTable(
  'convo_entry_replies',
  {
    id: serial('id').primaryKey(),
    entrySourceId: foreignKey('convo_message_source_id').notNull(),
    entryReplyId: foreignKey('convo_message_reply_id'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    //TODO: Add indexes
  })
);

export const convoEntryRepliesRelations = relations(
  convoEntryReplies,
  ({ one }) => ({
    convoMessageSource: one(convoEntries, {
      fields: [convoEntryReplies.entrySourceId],
      references: [convoEntries.id],
      relationName: 'inReplyTo'
    }),
    convoMessageReply: one(convoEntries, {
      fields: [convoEntryReplies.entryReplyId],
      references: [convoEntries.id],
      relationName: 'replies'
    })
  })
);

export const convoEntryPrivateVisibilityParticipants = mysqlTable(
  'convo_entry_private_visibility_participants',
  {
    id: serial('id').primaryKey(),
    entryId: foreignKey('entry_id').notNull(),
    convoMemberId: foreignKey('convo_member_id').notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    entryIdIndex: index('entry_id_idx').on(table.entryId)
  })
);

export const convoEntryPrivateVisibilityParticipantsRelations = relations(
  convoEntryPrivateVisibilityParticipants,
  ({ one }) => ({
    convoEntry: one(convoEntries, {
      fields: [convoEntryPrivateVisibilityParticipants.entryId],
      references: [convoEntries.id]
    }),
    convoMember: one(convoParticipants, {
      fields: [convoEntryPrivateVisibilityParticipants.convoMemberId],
      references: [convoParticipants.id]
    })
  })
);

// Billing Tables - only used in EE packages

export const orgBilling = mysqlTable(
  'org_billing',
  {
    id: serial('id').primaryKey(),
    orgId: foreignKey('org_id').notNull(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 128 }).notNull(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 128 }),
    plan: mysqlEnum('plan', [...stripePlanNames])
      .notNull()
      .default('free'),
    period: mysqlEnum('period', [...stripeBillingPeriods])
      .notNull()
      .default('monthly')
  },
  (table) => ({
    orgIdIndex: index('org_id_idx').on(table.orgId),
    stripeCustomerIdIndex: uniqueIndex('stripe_customer_id_idx').on(
      table.stripeCustomerId
    ),
    stripeSubscriptionIdIndex: uniqueIndex('stripe_subscription_id_idx').on(
      table.stripeSubscriptionId
    )
  })
);

export const orgBillingRelations = relations(orgBilling, ({ one, many }) => ({
  org: one(orgs, {
    fields: [orgBilling.orgId],
    references: [orgs.id]
  })
}));
