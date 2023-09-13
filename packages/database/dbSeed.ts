import { faker } from '@faker-js/faker';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';
import { and, eq, or } from './orm';
import {
  convos,
  convoAttachments,
  convoDrafts,
  convoMembers,
  convoMessages,
  convoMessageReplies,
  convoNotes,
  convoNoteReplies,
  convoSubjects,
  domains,
  domainVerifications,
  emailIdentities,
  emailIdentitiesAuthorizedUsers,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  foreignEmailIdentities,
  foreignEmailIdentitiesReputations,
  foreignEmailIdentitiesScreenerStatus,
  orgInvitations,
  orgMembers,
  orgModules,
  orgPostalConfigs,
  orgs,
  postalServers,
  sendAsExternalEmailIdentities,
  sendAsExternalEmailIdentitiesAuthorizedUsers,
  sendAsExternalEmailIdentitiesSmtpCredentials,
  sendAsExternalEmailIdentitiesVerification,
  users,
  userAuthIdentities,
  userGroups,
  userGroupMembers,
  userProfiles,
  userProfilesToOrgs
} from './schema';
import { db } from '.';

//! IMPORTANT: This file is only for development purposes, it should not be used in production
//! CHECK THE COMMENTS FOR REQUIRED FIELDS
// Register in the app for each type below, obtain your userId and profileId (not PublicId)
interface FixedSingleUserData {
  userId: number;
  profileId: number;
}
interface FixedUsersData {
  admin: FixedSingleUserData;
  user: FixedSingleUserData;
}
const fixedUsers: FixedUsersData = {
  admin: {
    userId: 1,
    profileId: 1
  },
  user: {
    userId: 2,
    profileId: 2
  }
};

// Replace the Avatar IDs with avatars you have already uploaded to the avatar storage
const userAvatarIds = [
  'cae90070-fe78-4284-0bf0-cb0b4371a300',
  '218965ee-dc60-4370-aa5d-83cd9af33500',
  'ca4ec7ee-c6df-4bec-c173-d69d65249000',
  'a8ac01a0-a6ff-4afa-1244-401a39b1cc00',
  'f29063db-55a8-4364-65ff-74c2ea76c700',
  '82521f66-f391-459a-302c-f2ec1e6c7e00',
  '9b843741-b777-4b75-828e-e2a4e5bbc200',
  'd6b60a4a-b83d-46fe-7eab-eea8f02aee00',
  'e8124686-0245-49df-7588-74c9ea67bc00',
  '12f46e42-591b-4c73-d9aa-5c060a457200',
  'b359486d-d293-46a4-2263-bc604554d500',
  '54fed323-ce31-436c-38eb-2dc984961c00',
  '37149c53-de34-4ed4-3d8d-b9c2df009000',
  'd34def99-7abc-45a0-ff9f-0fb9e3fc7f00',
  '0e02cef5-c56e-47f2-88d0-208048600300',
  'baddc6dd-f7c9-4317-e634-82bda2225d00',
  '3d3c6bcd-1301-40c7-8e9f-c727bdbf4300',
  'd97b6649-cc30-41d7-bf6c-2eecd9b18300',
  '3a090efb-9c3d-43b8-8b8c-e51144fb5e00',
  'b5dcdddf-11a2-4b70-326d-b41a1a7f1300',
  '16f2e402-3cdc-40a2-3698-cb5ad596ef00',
  '882b9683-de4c-4add-62f2-2b9295a49800',
  'c4ce3c98-86fd-4234-a37a-55d13b44fc00',
  '2813fb17-fe72-4ada-ecf4-2ab737134800',
  'd9d3b67c-70da-4116-7cf5-e04910120200',
  '47f08cf5-1be0-442c-39d0-564ff5c47000',
  'e6ddfb34-f1e7-4c7a-4bc8-6fb4baf0eb00',
  '1723f2a2-57f3-4b8d-02ab-e9bac4d39300',
  '39e0ccb5-7ba0-4ec1-38bd-ea97516cd800',
  'cbcb19ad-8da0-493e-0334-45f6d9981900'
];

const foreignIdentityAvatarIds = [
  '93fe8159-73d2-49f9-1aa9-f5d50ca56900',
  '72ef0be6-ffe4-44ce-3399-82b6c3da8c00',
  '4de219e1-99e5-4418-9ae2-85abf141f700',
  '4106fc1e-502d-4914-0300-be2188253400',
  '2701d6fc-04d9-4cc3-e592-7c4da1523b00',
  '6d3f3608-7c7c-427c-bc8c-b698c57b7f00',
  '558539e4-b01a-4b8c-aa84-d6a59345bf00',
  '3c08df38-69f9-42d4-a1d6-9304954b6800',
  '2c3e9e20-d0d9-4fe8-d0ce-58554a9b6c00',
  '38093327-6063-43a6-3c3a-fe4c4c97f400'
];

const orgAvatarIds = [
  'ba6be7f3-89b4-49b3-cae6-4b0511f93900',
  '72e167c4-9c4d-4030-4468-94efc3cdb900',
  '108e799a-0819-4a46-5451-259c41b3e700',
  'd64c5af8-91c3-4f35-9ac9-f6220130f700',
  '956a6d74-5eff-4bb2-7e6f-3f47189bf100'
];

// TODO: Refactor all "for" loops to push to an array, and then insert the array to the database.
// This will potentially improve performance by a lot
// needs to infer the type of insert using drizzle's InferInsertModel for proper typing

async function seedDb() {
  console.log('Seeding database...');
  console.time('⏱️ time');

  // Users
  const userIds = new Array(30).fill(0).map((_, i) => i + 100);
  const allUserIds = [
    ...userIds,
    fixedUsers.admin.userId,
    fixedUsers.user.userId
  ];

  for (let i = 0; i < userIds.length; i++) {
    await db.insert(users).values({
      id: userIds[i],
      publicId: nanoId(),
      username: faker.internet.userName(),
      recoveryEmail: faker.internet.email()
    });
  }
  console.log('Users inserted');
  console.timeLog('⏱️ time');

  // Auth Identities
  for (let i = 0; i < userIds.length; i++) {
    await db.insert(userAuthIdentities).values({
      userId: userIds[i],
      providerId: nanoId(),
      provider: 'hanko'
    });
  }
  console.log('Auth Identities inserted');
  console.timeLog('⏱️ time');

  // User Profiles
  for (let i = 0; i < userIds.length; i++) {
    await db.insert(userProfiles).values({
      id: userIds[i],
      publicId: nanoId(),
      userId: userIds[i],
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      nickname: '',
      title: faker.person.jobTitle(),
      blurb: faker.lorem.paragraph(),
      avatarId: userAvatarIds[i] || '',
      defaultProfile: true
    });
  }
  console.log('User Profiles inserted');
  console.timeLog('⏱️ time');

  // Orgs
  await db.insert(orgs).values([
    {
      id: 100,
      publicId: nanoId(),
      ownerId: fixedUsers.admin.userId,
      name: faker.company.name(),
      avatarId: orgAvatarIds[Math.floor(Math.random() * orgAvatarIds.length)],
      personalOrg: false
    },
    {
      id: 101,
      publicId: nanoId(),
      ownerId: userIds[0],
      name: faker.company.name(),
      avatarId: orgAvatarIds[Math.floor(Math.random() * orgAvatarIds.length)],
      personalOrg: false
    }
  ]);
  console.log('Orgs inserted');
  console.timeLog('⏱️ time');

  //Org Members
  for (let i = 0; i < userIds.length; i++) {
    await db.insert(orgMembers).values({
      userId: userIds[i],
      orgId: 100,
      invitedByUserId: fixedUsers.admin.userId,
      status: 'active',
      role: 'member',
      userProfileId: userIds[i]
    });

    if (i !== 0) {
      await db.insert(orgMembers).values({
        userId: userIds[i],
        orgId: 101,
        invitedByUserId: userIds[0],
        status: 'active',
        role: 'member',
        userProfileId: userIds[i]
      });
    }
  }
  await db.insert(orgMembers).values([
    {
      userId: fixedUsers.admin.userId,
      orgId: 100,
      invitedByUserId: fixedUsers.admin.userId,
      status: 'active',
      role: 'admin',
      userProfileId: fixedUsers.admin.profileId
    },
    {
      userId: fixedUsers.admin.userId,
      orgId: 101,
      invitedByUserId: userIds[0],
      status: 'active',
      role: 'member',
      userProfileId: fixedUsers.admin.profileId
    },
    {
      userId: fixedUsers.user.userId,
      orgId: 100,
      invitedByUserId: fixedUsers.admin.userId,
      status: 'active',
      role: 'member',
      userProfileId: fixedUsers.user.profileId
    },
    {
      userId: fixedUsers.user.userId,
      orgId: 101,
      invitedByUserId: userIds[0],
      status: 'active',
      role: 'member',
      userProfileId: fixedUsers.user.profileId
    },
    {
      userId: userIds[0],
      orgId: 101,
      invitedByUserId: userIds[0],
      status: 'active',
      role: 'admin',
      userProfileId: userIds[0]
    }
  ]);
  console.log('Org Members inserted');
  console.timeLog('⏱️ time');

  // User profiles to orgs
  for (let i = 0; i < userIds.length; i++) {
    await db.insert(userProfilesToOrgs).values([
      {
        userProfileId: userIds[i],
        orgId: 100
      },
      {
        userProfileId: userIds[i],
        orgId: 101
      }
    ]);
  }
  await db.insert(userProfilesToOrgs).values([
    {
      userProfileId: fixedUsers.admin.profileId,
      orgId: 100
    },
    {
      userProfileId: fixedUsers.admin.profileId,
      orgId: 101
    },
    {
      userProfileId: fixedUsers.user.profileId,
      orgId: 100
    },
    {
      userProfileId: fixedUsers.user.profileId,
      orgId: 101
    }
  ]);
  console.log('User Profiles to Orgs inserted');
  console.timeLog('⏱️ time');

  // Org Invitations
  for (let i = 0; i < 2; i++) {
    await db.insert(orgInvitations).values([
      {
        publicId: nanoId(),
        orgId: 100,
        invitedByUserId: fixedUsers.admin.userId,
        role: 'member',
        email: faker.internet.email(),
        inviteToken: nanoIdToken(),
        invitedAt: faker.date.past(),
        expiresAt: faker.date.future()
      },
      {
        publicId: nanoId(),
        orgId: 100,
        invitedByUserId: fixedUsers.admin.userId,
        role: 'member',
        invitedUser: userIds[Math.floor(Math.random() * userIds.length)],
        email: faker.internet.email(),
        inviteToken: nanoIdToken(),
        invitedAt: faker.date.past(),
        expiresAt: faker.date.future(),
        acceptedAt: faker.date.future()
      },
      {
        publicId: nanoId(),
        orgId: 101,
        invitedByUserId: fixedUsers.admin.userId,
        role: 'member',
        email: faker.internet.email(),
        inviteToken: nanoIdToken(),
        invitedAt: faker.date.past(),
        expiresAt: faker.date.future()
      },
      {
        publicId: nanoId(),
        orgId: 101,
        invitedByUserId: fixedUsers.admin.userId,
        role: 'member',
        invitedUser: userIds[Math.floor(Math.random() * userIds.length)],
        email: faker.internet.email(),
        inviteToken: nanoIdToken(),
        invitedAt: faker.date.past(),
        expiresAt: faker.date.future(),
        acceptedAt: faker.date.future()
      }
    ]);
  }
  console.log('Org Invitations inserted');
  console.timeLog('⏱️ time');

  // Org Modules
  await db.insert(orgModules).values([
    {
      orgId: 100,
      module: 'strip signatures',
      enabled: true,
      lastModifiedByUser: 100,
      lastModifiedAt: faker.date.past()
    },
    {
      orgId: 100,
      module: 'anonymous analytics',
      enabled: true,
      lastModifiedByUser: 101,
      lastModifiedAt: faker.date.past()
    },
    {
      orgId: 101,
      module: 'strip signatures',
      enabled: true,
      lastModifiedByUser: 102,
      lastModifiedAt: faker.date.past()
    },
    {
      orgId: 101,
      module: 'anonymous analytics',
      enabled: true,
      lastModifiedByUser: 103,
      lastModifiedAt: faker.date.past()
    }
  ]);
  console.log('Org Modules inserted');
  console.timeLog('⏱️ time');

  // Org Postal Configs
  await db.insert(orgPostalConfigs).values([
    {
      orgId: 100,
      host: 'server.uninbox.com',
      ipPools: ['pool1'],
      defaultIpPool: 'pool1'
    },
    {
      orgId: 101,
      host: 'server.uninbox.com',
      ipPools: ['pool1'],
      defaultIpPool: 'pool1'
    }
  ]);
  console.log('Org Postal Configs inserted');
  console.timeLog('⏱️ time');

  // User Group Data
  await db.insert(userGroups).values([
    {
      id: 100,
      publicId: nanoId(),
      orgId: 100,
      name: faker.commerce.department(),
      avatarId: '',
      description: faker.commerce.productDescription(),
      color: 'red'
    },
    {
      id: 101,
      publicId: nanoId(),
      orgId: 100,
      name: faker.commerce.department(),
      avatarId: '',
      description: faker.commerce.productDescription(),
      color: 'purple'
    },
    {
      id: 102,
      publicId: nanoId(),
      orgId: 100,
      name: faker.commerce.department(),
      avatarId: '',
      description: faker.commerce.productDescription(),
      color: 'green'
    },
    {
      id: 103,
      publicId: nanoId(),
      orgId: 101,
      name: faker.commerce.department(),
      avatarId: '',
      description: faker.commerce.productDescription(),
      color: 'yellow'
    },
    {
      id: 104,
      publicId: nanoId(),
      orgId: 101,
      name: faker.commerce.department(),
      avatarId: '',
      description: faker.commerce.productDescription(),
      color: 'pink'
    },
    {
      id: 105,
      publicId: nanoId(),
      orgId: 101,
      name: faker.commerce.department(),
      avatarId: '',
      description: faker.commerce.productDescription(),
      color: 'blue'
    }
  ]);
  console.log('User Groups inserted');
  console.timeLog('⏱️ time');

  // User Group Members
  for (let i = 0; i < userIds.length; i++) {
    await db.insert(userGroupMembers).values([
      {
        id: 1100 + i,
        groupId: 100,
        userId: userIds[i],
        userProfileId: userIds[i],
        addedBy: fixedUsers.admin.userId,
        role: 'member',
        notifications: 'active'
      },
      {
        id: 1200 + i,
        groupId: 101,
        userId: userIds[i],
        userProfileId: userIds[i],
        addedBy: fixedUsers.admin.userId,
        role: 'member',
        notifications: 'active'
      },
      {
        id: 1300 + i,
        groupId: 102,
        userId: userIds[i],
        userProfileId: userIds[i],
        addedBy: fixedUsers.admin.userId,
        role: 'member',
        notifications: 'active'
      },
      {
        id: 1100 + i + userIds.length,
        groupId: 103,
        userId: userIds[i],
        userProfileId: userIds[i],
        addedBy: fixedUsers.admin.userId,
        role: 'member',
        notifications: 'active'
      },
      {
        id: 1200 + i + userIds.length,
        groupId: 104,
        userId: userIds[i],
        userProfileId: userIds[i],
        addedBy: fixedUsers.admin.userId,
        role: 'member',
        notifications: 'active'
      },
      {
        id: 1300 + i + userIds.length,
        groupId: 105,
        userId: userIds[i],
        userProfileId: userIds[i],
        addedBy: fixedUsers.admin.userId,
        role: 'member',
        notifications: 'active'
      }
    ]);
  }
  await db.insert(userGroupMembers).values([
    {
      id: 1501,
      groupId: 100,
      userId: fixedUsers.admin.userId,
      userProfileId: fixedUsers.admin.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    },
    {
      id: 1502,
      userId: fixedUsers.admin.userId,
      groupId: 101,
      userProfileId: fixedUsers.admin.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    },
    {
      id: 1503,
      groupId: 102,
      userId: fixedUsers.admin.userId,
      userProfileId: fixedUsers.admin.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    },
    {
      id: 1504,
      groupId: 103,
      userId: fixedUsers.user.userId,
      userProfileId: fixedUsers.user.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    },
    {
      id: 1505,
      groupId: 104,
      userId: fixedUsers.user.userId,
      userProfileId: fixedUsers.user.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    },
    {
      id: 1506,
      groupId: 105,
      userId: fixedUsers.user.userId,
      userProfileId: fixedUsers.user.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    }
  ]);
  console.log('User Group Members inserted');
  console.timeLog('⏱️ time');

  // Domains
  await db.insert(domains).values([
    {
      id: 100,
      publicId: nanoId(),
      orgId: 100,
      postalHost: faker.internet.domainName(),
      domain: faker.internet.domainName(),
      postalId: faker.string.uuid(),
      dkimKey: 'postal-AaAaAa._domainkey',
      dkimValue: faker.string.uuid(),
      status: 'active',
      mode: 'native',
      dnsStatus: 'valid',
      statusUpdateAt: faker.date.past(),
      lastDnsCheckAt: faker.date.past()
    },
    {
      id: 101,
      publicId: nanoId(),
      orgId: 100,
      postalHost: faker.internet.domainName(),
      domain: faker.internet.domainName(),
      postalId: faker.string.uuid(),
      dkimKey: 'postal-AaAaAa._domainkey',
      dkimValue: faker.string.uuid(),
      status: 'active',
      mode: 'native',
      dnsStatus: 'valid',
      statusUpdateAt: faker.date.past(),
      lastDnsCheckAt: faker.date.past()
    },
    {
      id: 102,
      publicId: nanoId(),
      orgId: 101,
      postalHost: faker.internet.domainName(),
      domain: faker.internet.domainName(),
      postalId: faker.string.uuid(),
      dkimKey: 'postal-AaAaAa._domainkey',
      dkimValue: faker.string.uuid(),
      status: 'active',
      mode: 'native',
      dnsStatus: 'valid',
      statusUpdateAt: faker.date.past(),
      lastDnsCheckAt: faker.date.past()
    },
    {
      id: 103,
      publicId: nanoId(),
      orgId: 101,
      postalHost: faker.internet.domainName(),
      domain: faker.internet.domainName(),
      postalId: faker.string.uuid(),
      dkimKey: 'postal-AaAaAa._domainkey',
      dkimValue: faker.string.uuid(),
      status: 'active',
      mode: 'native',
      dnsStatus: 'valid',
      statusUpdateAt: faker.date.past(),
      lastDnsCheckAt: faker.date.past()
    }
  ]);
  console.log('Domains inserted');
  console.timeLog('⏱️ time');

  // Domain Verifications
  await db.insert(domainVerifications).values([
    {
      domainId: 100,
      verificationToken: nanoIdToken(),
      verifiedAt: faker.date.past()
    },
    {
      domainId: 101,
      verificationToken: nanoIdToken(),
      verifiedAt: faker.date.past()
    },
    {
      domainId: 102,
      verificationToken: nanoIdToken(),
      verifiedAt: faker.date.past()
    },
    {
      domainId: 103,
      verificationToken: nanoIdToken(),
      verifiedAt: faker.date.past()
    }
  ]);
  console.log('Domain Verifications inserted');
  console.timeLog('⏱️ time');

  // Postal Servers
  await db.insert(postalServers).values([
    {
      id: 100,
      publicId: nanoId(),
      orgId: 100,
      rootMailServer: false,
      type: 'email',
      sendLimit: 1000,
      apiKey: faker.string.uuid(),
      smtpKey: faker.string.uuid(),
      forwardingAddress: faker.internet.email()
    },
    {
      id: 101,
      publicId: nanoId(),
      orgId: 101,
      rootMailServer: false,
      type: 'email',
      sendLimit: 1000,
      apiKey: faker.string.uuid(),
      smtpKey: faker.string.uuid(),
      forwardingAddress: faker.internet.email()
    }
  ]);
  console.log('Postal Servers inserted');
  console.timeLog('⏱️ time');

  // Foreign Email Identities
  for (let i = 0; i < 30; i++) {
    await db.insert(foreignEmailIdentities).values({
      id: 100 + i,
      publicId: nanoId(),
      rootDomain: faker.internet.domainName(),
      username: faker.internet.userName(),
      avatarId:
        foreignIdentityAvatarIds[
          Math.floor(Math.random() * foreignIdentityAvatarIds.length)
        ],
      senderName: faker.person.fullName(),
      signature: faker.lorem.sentences()
    });
  }
  console.log('Foreign Email Identities inserted');
  console.timeLog('⏱️ time');

  // Foreign Email Identities Reputations
  for (let i = 0; i < 30; i++) {
    await db.insert(foreignEmailIdentitiesReputations).values({
      identityId: 100 + i,
      spam: Math.floor(Math.random() * 10),
      cold: Math.floor(Math.random() * 10)
    });
  }
  console.log('Foreign Email Identities Reputations inserted');
  console.timeLog('⏱️ time');

  // Foreign Email Identities Screener Status
  const foreignEmailScreenerStatus: ['pending', 'approve', 'reject', 'delete'] =
    ['pending', 'approve', 'reject', 'delete'];
  for (let i = 0; i < 30; i++) {
    const randomStatus =
      foreignEmailScreenerStatus[
        Math.floor(Math.random() * foreignEmailScreenerStatus.length)
      ];
    await db.insert(foreignEmailIdentitiesScreenerStatus).values({
      id: 100 + i,
      publicId: nanoId(),
      orgId: 100,
      foreignIdentityId: 100 + i,
      emailIdentityId: 100 + i,
      status: randomStatus,
      level: 'emailIdentity',
      setByUserId: Math.floor(Math.random() * 30) + 100
    });
  }
  console.log('Foreign Email Identities Screener Status inserted');
  console.timeLog('⏱️ time');

  // Send as external email identities
  for (let i = 0; i < 5; i++) {
    await db.insert(sendAsExternalEmailIdentities).values([
      {
        id: 100 + i,
        publicId: nanoId(),
        orgId: 100,
        verified: true,
        username: faker.internet.userName(),
        domain: faker.internet.domainName(),
        sendName: faker.person.fullName(),
        smtpCredentialsId: 100 + i,
        createdBy: Math.floor(Math.random() * 30) + 100
      },
      {
        id: 100 + i + 5,
        publicId: nanoId(),
        orgId: 101,
        verified: true,
        username: faker.internet.userName(),
        domain: faker.internet.domainName(),
        sendName: faker.person.fullName(),
        smtpCredentialsId: 100 + i * 5,
        createdBy: Math.floor(Math.random() * 30) + 100
      }
    ]);
  }
  console.log('Send as external email identities inserted');
  console.timeLog('⏱️ time');

  // Send as external email identities verification Data
  for (let i = 0; i < 10; i++) {
    await db.insert(sendAsExternalEmailIdentitiesVerification).values({
      identityId: 100 + i,
      verificationToken: nanoIdToken(),
      verifiedAt: faker.date.past()
    });
  }
  console.log('Send as external email identities verification inserted');
  console.timeLog('⏱️ time');

  // Send as external email identities Smtp Credentials Data
  for (let i = 0; i < 10; i++) {
    await db.insert(sendAsExternalEmailIdentitiesSmtpCredentials).values({
      id: 100 + i,
      username: faker.internet.userName(),
      password: faker.internet.password(),
      host: faker.internet.domainName(),
      port: 587,
      authMethod: 'plain',
      encryption: 'tls',
      createdBy: 100 + i
    });
  }
  console.log('Send as external email identities Smtp Credentials inserted');
  console.timeLog('⏱️ time');

  // Send as external email identities authorized users Data
  for (let i = 0; i < 10; i++) {
    await db.insert(sendAsExternalEmailIdentitiesAuthorizedUsers).values([
      {
        identityId: 100 + i,
        userGroupId: 100 + i,
        addedBy: 100
      },
      {
        identityId: 100 + i,
        userId: 100 + i,
        addedBy: 100
      }
    ]);
  }
  console.log('Send as external email identities authorized users inserted');
  console.timeLog('⏱️ time');

  // Email Routing Rules
  for (let i = 0; i < 30; i++) {
    await db.insert(emailRoutingRules).values([
      {
        id: 100 + i,
        publicId: nanoId(),
        orgId: 100,
        name: faker.commerce.department(),
        description: faker.commerce.productDescription(),
        createdBy: 100
      },
      {
        id: 200 + i,
        publicId: nanoId(),
        orgId: 101,
        name: faker.commerce.department(),
        description: faker.commerce.productDescription(),
        createdBy: 101
      }
    ]);
  }
  console.log('Email Routing Rules inserted');
  console.timeLog('⏱️ time');

  // Email Routing Rules Destinations
  for (let i = 0; i < 30; i++) {
    await db.insert(emailRoutingRulesDestinations).values([
      {
        ruleId: 100 + i,
        groupId: 100 + i
      },
      {
        ruleId: 100 + i,
        userId: 100 + i
      },
      {
        ruleId: 200 + i,
        groupId: 100 + i
      },
      {
        ruleId: 200 + i,
        userId: 100 + i
      }
    ]);
  }
  console.log('Email Routing Rules Destinations inserted');
  console.timeLog('⏱️ time');

  // Email Identities
  for (let i = 0; i < 30; i++) {
    await db.insert(emailIdentities).values([
      {
        id: 100 + i,
        publicId: nanoId(),
        orgId: 100,
        username: faker.internet.userName(),
        domainName: faker.internet.domainName(),
        domainId: 100,
        routingRuleId: 100 + i,
        sendName: faker.person.fullName(),
        createdBy: 100
      },
      {
        id: 100 + i + 30,
        publicId: nanoId(),
        orgId: 100,
        username: faker.internet.userName(),
        domainName: faker.internet.domainName(),
        domainId: 101,
        routingRuleId: 100 + i,
        sendName: faker.person.fullName(),
        createdBy: 100
      },
      {
        id: 200 + i,
        publicId: nanoId(),
        orgId: 101,
        username: faker.internet.userName(),
        domainName: faker.internet.domainName(),
        domainId: 102,
        routingRuleId: 200 + i,
        sendName: faker.person.fullName(),
        createdBy: 101
      },
      {
        id: 200 + i + 30,
        publicId: nanoId(),
        orgId: 101,
        username: faker.internet.userName(),
        domainName: faker.internet.domainName(),
        domainId: 103,
        routingRuleId: 200 + i,
        sendName: faker.person.fullName(),
        createdBy: 102
      }
    ]);
  }
  console.log('Email Identities inserted');
  console.timeLog('⏱️ time');

  // Email Identities Authorized Users
  for (let i = 0; i < 30; i++) {
    await db.insert(emailIdentitiesAuthorizedUsers).values([
      {
        identityId: 100 + i,
        userId: 100 + i,
        addedBy: 100
      },
      {
        identityId: 100 + i + 30,
        userId: 100 + i,
        addedBy: 100
      },
      {
        identityId: 200 + i,
        userId: 100 + i,
        addedBy: 100
      },
      {
        identityId: 200 + i + 30,
        userId: 100 + i,
        addedBy: 100
      }
    ]);
  }
  for (let i = 0; i < 6; i++) {
    await db.insert(emailIdentitiesAuthorizedUsers).values([
      {
        identityId: 100 + i,
        userGroupId: 100 + i,
        addedBy: 100
      },
      {
        identityId: 100 + i + 30,
        userGroupId: 100 + i,
        addedBy: 100
      },
      {
        identityId: 200 + i,
        userGroupId: 100 + i,
        addedBy: 100
      },
      {
        identityId: 200 + i + 30,
        userGroupId: 100 + i,
        addedBy: 100
      }
    ]);
  }
  console.log('Email Identities Authorized Users inserted');
  console.timeLog('⏱️ time');

  // Convos
  const convoScreenerStatuses: ['pending', 'approved', 'rejected', 'deleted'] =
    ['pending', 'approved', 'rejected', 'deleted'];
  for (let i = 0; i < 50; i++) {
    const randomStatus =
      convoScreenerStatuses[
        Math.floor(Math.random() * convoScreenerStatuses.length)
      ];
    await db.insert(convos).values([
      {
        id: 100 + i,
        publicId: nanoId(),
        orgId: 100,
        lastUpdatedAt: faker.date.past(),
        screenerStatus: randomStatus
      },
      {
        id: 200 + i,
        publicId: nanoId(),
        orgId: 101,
        lastUpdatedAt: faker.date.past(),
        screenerStatus: randomStatus
      }
    ]);
  }
  console.log('Convos inserted');
  console.timeLog('⏱️ time');

  // convo subjects
  for (let i = 0; i < 50; i++) {
    await db.insert(convoSubjects).values([
      {
        id: 100 + i,
        convoId: 100 + i,
        subject: faker.lorem.sentence()
      },
      {
        id: 200 + i,
        convoId: 200 + i,
        subject: faker.lorem.sentence()
      }
    ]);
  }
  for (let i = 0; i < 20; i++) {
    await db.insert(convoSubjects).values([
      {
        id: 300 + i,
        convoId: 100 + i * 2,
        subject: faker.lorem.sentence()
      },
      {
        id: 400 + i,
        convoId: 200 + i * 2,
        subject: faker.lorem.sentence()
      }
    ]);
  }
  console.log('Convo Subjects inserted');
  console.timeLog('⏱️ time');

  // convo members
  const convoRoles: ['assigned', 'contributor', 'watcher', 'guest'] = [
    'assigned',
    'contributor',
    'watcher',
    'guest'
  ];
  const convoNotifications: ['active', 'muted', 'off'] = [
    'active',
    'muted',
    'off'
  ];
  const groupIds1 = [100, 101, 102];
  const groupIds2 = [103, 104, 105];
  for (let i = 0; i < 50; i++) {
    //! Does not add fixed users
    const user1 = allUserIds[Math.floor(Math.random() * allUserIds.length)];
    const user2 = allUserIds[Math.floor(Math.random() * allUserIds.length)];
    await db.insert(convoMembers).values([
      {
        id: 100 + i,
        convoId: 100 + i,
        userId: user1,
        userProfileId: user1,
        role: convoRoles[Math.floor(Math.random() * convoRoles.length)],
        notifications:
          convoNotifications[
            Math.floor(Math.random() * convoNotifications.length)
          ]
      },
      {
        id: 200 + i,
        convoId: 100 + i,
        userGroupId: groupIds1[Math.floor(Math.random() * groupIds1.length)],
        role: convoRoles[Math.floor(Math.random() * convoRoles.length)],
        notifications:
          convoNotifications[
            Math.floor(Math.random() * convoNotifications.length)
          ]
      },
      {
        id: 300 + i,
        convoId: 100 + i,
        foreignEmailIdentityId: 100 + i,
        role: 'contributor',
        notifications: 'active'
      },
      {
        id: 400 + i,
        convoId: 200 + i,
        userId: user2,
        userProfileId: user2,
        role: convoRoles[Math.floor(Math.random() * convoRoles.length)],
        notifications:
          convoNotifications[
            Math.floor(Math.random() * convoNotifications.length)
          ]
      },
      {
        id: 500 + i,
        convoId: 200 + i,
        userGroupId: groupIds2[Math.floor(Math.random() * groupIds2.length)],
        role: convoRoles[Math.floor(Math.random() * convoRoles.length)],
        notifications:
          convoNotifications[
            Math.floor(Math.random() * convoNotifications.length)
          ]
      },
      {
        id: 600 + i,
        convoId: 200 + i,
        foreignEmailIdentityId: 100 + i,
        role: 'contributor',
        notifications: 'active'
      }
    ]);
  }
  console.log('Convo Members inserted');
  console.timeLog('⏱️ time');

  // convo messages
  const convoIds = Array.from({ length: 50 }, (_, i) => i + 100);
  const convoIds2 = Array.from({ length: 50 }, (_, i) => i + 200);
  const convoRefMessageSubjects = [
    ...Array.from({ length: 50 }, (_, i) => i + 100),
    ...Array.from({ length: 50 }, (_, i) => i + 200),
    ...Array.from({ length: 20 }, (_, i) => i + 300),
    ...Array.from({ length: 20 }, (_, i) => i + 400)
  ];
  const convoRefMessageMembers = [
    ...Array.from({ length: 50 }, (_, i) => i + 100),
    ...Array.from({ length: 50 }, (_, i) => i + 200),
    ...Array.from({ length: 50 }, (_, i) => i + 300),
    ...Array.from({ length: 50 }, (_, i) => i + 400),
    ...Array.from({ length: 50 }, (_, i) => i + 500),
    ...Array.from({ length: 50 }, (_, i) => i + 600)
  ];
  for (let i = 0; i < 1000; i++) {
    await db.insert(convoMessages).values([
      {
        id: 1000 + i,
        publicId: nanoId(),
        convoId: convoIds[Math.floor(Math.random() * 50)],
        subjectId: convoRefMessageSubjects[Math.floor(Math.random() * 140)],
        author: convoRefMessageMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        postalMessageId: faker.string.uuid(),
        postalId: Math.floor(Math.random() * 300)
      },
      {
        id: 3000 + i,
        publicId: nanoId(),
        convoId: convoIds2[Math.floor(Math.random() * 50)],
        subjectId: convoRefMessageSubjects[Math.floor(Math.random() * 140)],
        author: convoRefMessageMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        postalMessageId: faker.string.uuid(),
        postalId: Math.floor(Math.random() * 300)
      }
    ]);
  }
  for (let i = 0; i < 300; i++) {
    await db.insert(convoMessages).values([
      {
        id: 5000 + i,
        publicId: nanoId(),
        convoId: convoIds[Math.floor(Math.random() * 50)],
        subjectId: convoRefMessageSubjects[Math.floor(Math.random() * 140)],
        replyToId: 1000 + i * 2,
        author: convoRefMessageMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        postalMessageId: faker.string.uuid(),
        postalId: Math.floor(Math.random() * 300)
      },
      {
        id: 6000 + i,
        publicId: nanoId(),
        convoId: convoIds2[Math.floor(Math.random() * 50)],
        subjectId: convoRefMessageSubjects[Math.floor(Math.random() * 140)],
        replyToId: 3000 + i * 2,
        author: convoRefMessageMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        postalMessageId: faker.string.uuid(),
        postalId: Math.floor(Math.random() * 300)
      }
    ]);
  }
  console.log('Convo Messages inserted');
  console.timeLog('⏱️ time');

  // convo attachments
  const convoRefMessageIds = [
    ...Array.from({ length: 1000 }, (_, i) => i + 1000),
    ...Array.from({ length: 1000 }, (_, i) => i + 3000),
    ...Array.from({ length: 300 }, (_, i) => i + 5000),
    ...Array.from({ length: 300 }, (_, i) => i + 6000)
  ];
  for (let i = 0; i < 25; i++) {
    await db.insert(convoAttachments).values([
      {
        id: 100 + i,
        publicId: nanoId(),
        convoId: 100 + i * 2,
        convoMessageId: convoRefMessageIds[Math.floor(Math.random() * 2600)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 100 + i * 3
      },
      {
        id: 200 + i,
        publicId: nanoId(),
        convoId: 100 + i * 2,
        convoNoteId: convoRefMessageIds[Math.floor(Math.random() * 2600)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 100 + i * 3
      },
      {
        id: 300 + i,
        publicId: nanoId(),
        convoId: 100 + i * 2,
        convoDraftId: convoRefMessageIds[Math.floor(Math.random() * 2600)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 100 + i * 3
      },
      {
        id: 400 + i,
        publicId: nanoId(),
        convoId: 200 + i * 2,
        convoMessageId: convoRefMessageIds[Math.floor(Math.random() * 2600)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 200 + i * 3
      },
      {
        id: 500 + i,
        publicId: nanoId(),
        convoId: 200 + i * 2,
        convoNoteId: convoRefMessageIds[Math.floor(Math.random() * 2600)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 200 + i * 3
      },
      {
        id: 600 + i,
        publicId: nanoId(),
        convoId: 200 + i * 2,
        convoDraftId: convoRefMessageIds[Math.floor(Math.random() * 2600)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 200 + i * 3
      }
    ]);
  }
  console.log('Convo Attachments inserted');
  console.timeLog('⏱️ time');

  // convo message replies
  for (let i = 0; i < 300; i++) {
    await db.insert(convoMessageReplies).values([
      {
        convoMessageSourceId: 1000 + i * 2,
        convoMessageReplyId: 5000 + i
      },
      {
        convoMessageSourceId: 3000 + i * 2,
        convoMessageReplyId: 6000 + i
      }
    ]);
  }
  console.log('Convo Message Replies inserted');
  console.timeLog('⏱️ time');

  // Convo notes
  const convoRefNotesIds = Array.from({ length: 50 }, (_, i) => i + 100);
  const convoRefNotesIds2 = Array.from({ length: 50 }, (_, i) => i + 200);
  const convoRefNotesMembers = [
    ...Array.from({ length: 100 }, (_, i) => i + 100),
    ...Array.from({ length: 100 }, (_, i) => i + 200),
    ...Array.from({ length: 50 }, (_, i) => i + 1000),
    ...Array.from({ length: 50 }, (_, i) => i + 2000)
  ];
  const noteVisibility: ['self', 'convo', 'org', 'public'] = [
    'self',
    'convo',
    'org',
    'public'
  ];

  for (let i = 0; i < 1000; i++) {
    await db.insert(convoNotes).values([
      {
        id: 1000 + i,
        publicId: nanoId(),
        convoId: convoRefNotesIds[Math.floor(Math.random() * 50)],
        author: convoRefNotesMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        visibility: noteVisibility[Math.floor(Math.random() * 4)]
      },
      {
        id: 3000 + i,
        publicId: nanoId(),
        convoId: convoRefNotesIds2[Math.floor(Math.random() * 50)],
        author: convoRefNotesMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        visibility: noteVisibility[Math.floor(Math.random() * 4)]
      }
    ]);
  }
  for (let i = 0; i < 300; i++) {
    await db.insert(convoNotes).values([
      {
        id: 5000 + i,
        publicId: nanoId(),
        convoId: convoRefNotesIds[Math.floor(Math.random() * 50)],
        replyToId: 1000 + i * 2,
        author: convoRefNotesMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        visibility: noteVisibility[Math.floor(Math.random() * 4)]
      },
      {
        id: 6000 + i,
        publicId: nanoId(),
        convoId: convoRefNotesIds2[Math.floor(Math.random() * 50)],
        replyToId: 3000 + i * 2,
        author: convoRefNotesMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        visibility: noteVisibility[Math.floor(Math.random() * 4)]
      }
    ]);
  }
  console.log('Convo Notes inserted');
  console.timeLog('⏱️ time');

  // Convo note replies
  for (let i = 0; i < 300; i++) {
    await db.insert(convoNoteReplies).values([
      {
        convoNoteSourceId: 1000 + i * 2,
        convoNoteReplyId: 5000 + i
      },
      {
        convoNoteSourceId: 3000 + i * 2,
        convoNoteReplyId: 6000 + i
      }
    ]);
  }
  console.log('Convo Note Replies inserted');
  console.timeLog('⏱️ time');

  // convo drafts
  const convoRefDraftIds = Array.from({ length: 50 }, (_, i) => i + 100);
  const convoRefDraftIds2 = Array.from({ length: 50 }, (_, i) => i + 200);
  const convoRefDraftMembers = [
    ...Array.from({ length: 100 }, (_, i) => i + 100),
    ...Array.from({ length: 100 }, (_, i) => i + 200),
    ...Array.from({ length: 50 }, (_, i) => i + 1000),
    ...Array.from({ length: 50 }, (_, i) => i + 2000)
  ];
  const draftVisibility: ['self', 'convo', 'org', 'public'] = [
    'self',
    'convo',
    'org',
    'public'
  ];

  for (let i = 0; i < 200; i++) {
    await db.insert(convoDrafts).values([
      {
        id: 1000 + i,
        publicId: nanoId(),
        convoId: convoRefDraftIds[Math.floor(Math.random() * 50)],
        author: convoRefDraftMembers[Math.floor(Math.random() * 300)],
        visibility: draftVisibility[Math.floor(Math.random() * 4)],
        body: faker.lorem.sentences()
      },
      {
        id: 2000 + i,
        publicId: nanoId(),
        convoId: convoRefDraftIds2[Math.floor(Math.random() * 50)],
        author: convoRefDraftMembers[Math.floor(Math.random() * 300)],
        visibility: draftVisibility[Math.floor(Math.random() * 4)],
        body: faker.lorem.sentences()
      }
    ]);
  }
  console.log('Convo Drafts inserted');
  console.timeLog('⏱️ time');

  console.log('');
  console.log('');
  console.log('👏 All Done');

  console.timeEnd('⏱️ time');
}
seedDb();
