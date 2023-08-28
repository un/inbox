import {
  bigint,
  mediumint,
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

// These custom types support incompatibilities with drizzle-orm or types that must remain in sync across db

// Custom nanoId type = easy increase length later - used as "publicId: nanoId('public_id')
const nanoId = customType<{ data: string; notNull: true }>({
  dataType() {
    return 'varchar(16)';
  }
});

// Foreign Key type as drizzle does not support unsigned bigint
const foreignKey = customType<{ data: number }>({
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
  recoveryEmails: one(userRecoveryEmails, {
    fields: [users.id],
    references: [userRecoveryEmails.userId]
  }),
  orgMemberships: many(orgMembers),
  profile: many(userProfiles),
  defaultProfile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId]
  })
}));

export const userRecoveryEmails = mysqlTable(
  'user_recovery_emails',
  {
    id: serial('id').primaryKey(),
    userId: foreignKey('user_id').notNull(),
    emailHash: varchar('email', { length: 255 }).notNull(),
    lastUpdatedAt: timestamp('last_updated_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(), // This will be used to determine the secret version that was used for hashing
    verifyLastDismissedAt: timestamp('last_dismissed_at'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    userIdIndex: index('user_id_idx').on(table.userId),
    lastUpdatedAtIndex: index('last_updated_at_idx').on(table.lastUpdatedAt)
  })
);
export const userRecoveryEmailsRelations = relations(
  userRecoveryEmails,
  ({ one }) => ({
    user: one(users, {
      fields: [userRecoveryEmails.userId],
      references: [users.id]
    })
  })
);

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
    orgs: many(userProfilesToOrgs)
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
  modules: many(orgModules),
  userProfiles: many(userProfilesToOrgs),
  postalConfig: one(orgPostalConfigs, {
    fields: [orgs.id],
    references: [orgPostalConfigs.orgId]
  })
}));

export const orgMembers = mysqlTable(
  'org_members',
  {
    userId: foreignKey('user_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    invitedByUserId: foreignKey('invited_by_user_id'),
    status: mysqlEnum('status', ['active', 'removed']).notNull(),
    role: mysqlEnum('role', ['member', 'admin']).notNull(),
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
    email: varchar('email', { length: 256 }),
    invitedAt: timestamp('invited_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    acceptedAt: timestamp('accepted_at')
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    orgIdIndex: index('org_id_idx').on(table.orgId)
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
  ({ one }) => ({
    org: one(orgs, {
      fields: [orgPostalConfigs.orgId],
      references: [orgs.id]
    })
  })
);

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

// Domain table
export const domains = mysqlTable(
  'domains',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    domain: varchar('domain', { length: 256 }).notNull(),
    postalId: varchar('postal_id', { length: 64 }),
    dkimKey: varchar('dkim_key', { length: 32 }),
    dkimValue: varchar('dkim_value', { length: 256 }),
    status: mysqlEnum('status', ['active', 'removed']).notNull(),
    mode: mysqlEnum('status', ['native', 'forwarding']).notNull(), // native = all mail comes to UnInbox, forwarding = mail is forwarded from another mail system
    dnsStatus: mysqlEnum('dns_status', [
      'pending',
      'verified',
      'valid',
      'failed'
    ]).notNull(), // verified is used when using the TXT verification method, valid is when all DNS records are validated
    forwardingAddress: varchar('forwarding_address', { length: 64 }),
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
  })
}));

// Postal server table
export const postalServers = mysqlTable(
  'postal_servers',
  {
    id: serial('id').primaryKey(),
    publicId: nanoId('public_id').notNull(),
    orgId: foreignKey('org_id').notNull(),
    type: mysqlEnum('type', ['email', 'transactional', 'marketing']).notNull(),
    sendLimit: mediumint('send_limit').notNull(),
    apiKey: varchar('api_key', { length: 256 }).notNull(),
    smtpKey: varchar('smtp_key', { length: 256 }).notNull()
  },
  (table) => ({
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
