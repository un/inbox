import { nanoId, nanoIdToken } from '@uninbox/utils';
import { faker } from '@faker-js/faker';

interface FixedSingleUserData {
  userId: number;
  profileId: number;
}
export interface FixedUsersData {
  admin: FixedSingleUserData;
  user: FixedSingleUserData;
}
export const userIds = new Array(30).fill(0).map((_, i) => i + 100);

export const usersData = (userIds: number[]) => {
  const users: object[] = [];
  for (let i = 0; i < userIds.length; i++) {
    users.push({
      id: userIds[i],
      publicId: nanoId(),
      username: faker.internet.userName(),
      recoveryEmail: faker.internet.email()
    });
  }
  return users;
};
export const userAuthIdentitiesData = (userIds: number[]) => {
  const userAuthIdentities: object[] = [];
  for (let i = 0; i < userIds.length; i++) {
    userAuthIdentities.push({
      userId: userIds[i],
      providerId: nanoId(),
      provider: 'hanko'
    });
  }
  return userAuthIdentities;
};

export const userProfilesData = (
  userIds: number[],
  userAvatarIds: string[]
) => {
  const userProfiles: object[] = [];
  for (let i = 0; i < userIds.length; i++) {
    userProfiles.push({
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

  return userProfiles;
};

export const orgsData = (
  userIds: number[],
  fixedUsers: FixedUsersData,
  orgAvatarIds: string[]
) => {
  const orgs: object[] = [];
  orgs.push({
    id: 100,
    publicId: nanoId(),
    ownerId: fixedUsers.admin.userId,
    name: faker.company.name(),
    avatarId: orgAvatarIds[Math.floor(Math.random() * orgAvatarIds.length)],
    personalOrg: false
  });
  orgs.push({
    id: 101,
    publicId: nanoId(),
    ownerId: userIds[0],
    name: faker.company.name(),
    avatarId: orgAvatarIds[Math.floor(Math.random() * orgAvatarIds.length)],
    personalOrg: false
  });
  return orgs;
};

export const orgMembersData = (
  userIds: number[],
  fixedUsers: FixedUsersData
) => {
  const orgMembers: object[] = [];

  for (let i = 0; i < userIds.length; i++) {
    orgMembers.push({
      userId: userIds[i],
      orgId: 100,
      invitedByUserId: fixedUsers.admin.userId,
      status: 'active',
      role: 'member',
      userProfileId: userIds[i]
    });

    if (i !== 0) {
      orgMembers.push({
        userId: userIds[i],
        orgId: 101,
        invitedByUserId: userIds[0],
        status: 'active',
        role: 'member',
        userProfileId: userIds[i]
      });
    }
  }
  orgMembers.push(
    {
      userId: fixedUsers.admin.userId,
      orgId: 100,
      invitedByUserId: fixedUsers.admin.userId,
      status: 'active',
      role: 'owner',
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
      role: 'owner',
      userProfileId: userIds[0]
    }
  );

  return orgMembers;
};

export const userProfilesToOrgsData = (
  userIds: number[],
  orgIds: number[],
  fixedUsers: FixedUsersData
) => {
  const userProfilesToOrgs: object[] = [];
  for (let i = 0; i < userIds.length; i++) {
    userProfilesToOrgs.push(
      {
        userProfileId: userIds[i],
        orgId: 100
      },
      {
        userProfileId: userIds[i],
        orgId: 101
      }
    );
  }
  userProfilesToOrgs.push(
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
  );
  return userProfilesToOrgs;
};

export const orgInvitationsData = (
  fixedUsers: FixedUsersData,
  userIds: number[]
) => {
  const orgInvitations: object[] = [];

  for (let i = 0; i < 2; i++) {
    orgInvitations.push(
      {
        publicId: nanoId(),
        orgId: 100,
        invitedByUserId: fixedUsers.admin.userId,
        role: 'member',
        invitedUser: '',
        email: faker.internet.email(),
        inviteToken: nanoIdToken(),
        invitedAt: faker.date.past(),
        expiresAt: faker.date.future(),
        acceptedAt: ''
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
        invitedUser: '',
        email: faker.internet.email(),
        inviteToken: nanoIdToken(),
        invitedAt: faker.date.past(),
        expiresAt: faker.date.future(),
        acceptedAt: ''
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
    );
  }
  return orgInvitations;
};

export const orgModulesData = () => {
  const orgModules: object[] = [];

  orgModules.push(
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
  );
  return orgModules;
};

export const orgPostalConfigsData = () => {
  const orgPostalConfigs: object[] = [];
  orgPostalConfigs.push(
    {
      orgId: 100,
      host: '',
      ipPools: '',
      defaultIpPool: ''
    },
    {
      orgId: 101,
      host: '',
      ipPools: '',
      defaultIpPool: ''
    }
  );

  return orgPostalConfigs;
};

export const userGroupsData = () => {
  const userGroups: object[] = [];
  userGroups.push(
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
  );

  return userGroups;
};

export const userGroupMembersData = (
  fixedUsers: FixedUsersData,
  userIds: number[]
) => {
  const userGroupMembers: object[] = [];

  for (let i = 0; i < userIds.length; i++) {
    userGroupMembers.push(
      {
        id: userIds[i] + 1001,
        groupId: Math.floor(Math.random() * 6) + 100,
        userId: userIds[i],
        userProfileId: userIds[i],
        addedBy: fixedUsers.admin.userId,
        role: 'member',
        notifications: 'active'
      },
      {
        id: userIds[i] + 1002,
        groupId: Math.floor(Math.random() * 6) + 100,
        userId: userIds[i],
        userProfileId: userIds[i],
        addedBy: fixedUsers.admin.userId,
        role: 'member',
        notifications: 'active'
      },
      {
        id: userIds[i] + 1003,
        groupId: Math.floor(Math.random() * 6) + 100,
        userId: userIds[i],
        userProfileId: userIds[i],
        addedBy: fixedUsers.admin.userId,
        role: 'member',
        notifications: 'active'
      }
    );
  }
  userGroupMembers.push(
    {
      groupId: Math.floor(Math.random() * 6) + 100,
      userId: fixedUsers.admin.userId,
      userProfileId: fixedUsers.admin.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    },
    {
      groupId: Math.floor(Math.random() * 6) + 100,
      userId: fixedUsers.admin.userId,
      userProfileId: fixedUsers.admin.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    },
    {
      groupId: Math.floor(Math.random() * 6) + 100,
      userId: fixedUsers.admin.userId,
      userProfileId: fixedUsers.admin.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    },
    {
      groupId: Math.floor(Math.random() * 6) + 100,
      userId: fixedUsers.user.userId,
      userProfileId: fixedUsers.user.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    },
    {
      groupId: Math.floor(Math.random() * 6) + 100,
      userId: fixedUsers.user.userId,
      userProfileId: fixedUsers.user.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    },
    {
      groupId: Math.floor(Math.random() * 6) + 100,
      userId: fixedUsers.user.userId,
      userProfileId: fixedUsers.user.profileId,
      addedBy: fixedUsers.admin.userId,
      role: 'member',
      notifications: 'active'
    }
  );

  return userGroupMembers;
};

export const domainsData = () => {
  const domains: object[] = [];

  domains.push(
    {
      id: 100,
      publicId: nanoId(),
      orgId: 100,
      postalHost: faker.internet.domainName(),
      domain: faker.internet.domainName(),
      postalId: faker.string.uuid(),
      dkimKey: faker.string.uuid(),
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
      dkimKey: faker.string.uuid(),
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
      dkimKey: faker.string.uuid(),
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
      dkimKey: faker.string.uuid(),
      dkimValue: faker.string.uuid(),
      status: 'active',
      mode: 'native',
      dnsStatus: 'valid',
      statusUpdateAt: faker.date.past(),
      lastDnsCheckAt: faker.date.past()
    }
  );

  return domains;
};

export const domainVerificationsData = () => {
  const domainVerifications: object[] = [];
  domainVerifications.push(
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
  );

  return domainVerifications;
};

export const postalServersData = () => {
  const postalServers: object[] = [];
  postalServers.push(
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
  );
  return postalServers;
};

export const externalEmailIdentitiesData = (
  externalIdentityAvatarIds: string[]
) => {
  const externalEmailIdentities: object[] = [];

  for (let i = 0; i < 30; i++) {
    externalEmailIdentities.push({
      id: 100 + i,
      publicId: nanoId(),
      rootDomain: faker.internet.domainName(),
      username: faker.internet.userName(),
      avatarId:
        externalIdentityAvatarIds[
          Math.floor(Math.random() * externalIdentityAvatarIds.length)
        ],
      senderName: faker.person.fullName(),
      signature: faker.lorem.sentences()
    });
  }
  return externalEmailIdentities;
};

export const externalEmailIdentitiesReputationsData = () => {
  const externalEmailIdentitiesReputations: object[] = [];
  for (let i = 0; i < 30; i++) {
    externalEmailIdentitiesReputations.push({
      identityId: 100 + i,
      spam: Math.floor(Math.random() * 10),
      cold: Math.floor(Math.random() * 10)
    });
  }
  return externalEmailIdentitiesReputations;
};

export const externalEmailIdentitiesScreenerStatusData = [
  {
    publicId: '',
    orgId: '',
    externalIdentityId: '',
    rootEmailIdentityId: '',
    emailIdentityId: '',
    status: '',
    level: '',
    setByUserId: ''
  }
];

export const sendAsExternalEmailIdentities = [
  {
    publicId: '',
    orgId: '',
    verified: false,
    username: '',
    domain: '',
    sendName: '',
    addedBy: '',
    smtpCredentialsId: ''
  }
];

export const sendAsExternalEmailIdentitiesVerificationData = [
  {
    identityId: '',
    verificationToken: '',
    verifiedAt: ''
  }
];

export const sendAsExternalEmailIdentitiesSmtpCredentialsData = [
  {
    username: '',
    password: '',
    host: '',
    port: 1337,
    authMethod: '',
    encryption: '',
    addedBy: 99
  }
];

export const sendAsExternalEmailIdentitiesAuthorizedUsersData = [
  {
    identityId: '',
    userId: '',
    userGroupId: '',
    addedBy: ''
  }
];

export const emailIdentitiesData = [
  {
    publicId: '',
    orgId: '',
    username: '',
    domainName: '',
    domainId: '',
    routingRuleId: '',
    sendName: '',
    avatarId: '',
    isCatchAll: false
  }
];

export const emailIdentitiesAuthorizedUsersData = [
  {
    identityId: '',
    userId: '',
    userGroupId: '',
    addedBy: ''
  }
];

export const emailRoutingRulesData = [
  {
    publicId: '',
    orgId: '',
    name: '',
    description: ''
  }
];

export const emailRoutingRulesDestinationsData = [
  {
    ruleId: '',
    groupId: '',
    userId: ''
  }
];

export const convosData = [
  {
    orgId: '',
    publicId: '',
    lastUpdatedAt: '',
    lastMessageId: '',
    lastNoteId: '',
    screenerStatus: ''
  }
];

export const convoSubjectsData = [
  {
    convoId: '',
    subject: ''
  }
];

export const convoMembersData = [
  {
    userId: '',
    userProfileId: '',
    userGroupId: '',
    externalEmailIdentityId: '',
    convoId: '',
    role: '',
    notifications: '',
    active: true
  }
];

export const convoAttachmentsData = [
  {
    publicId: '',
    convoId: '',
    convoMessageId: '',
    convoNoteId: '',
    convoDraftId: '',
    fileName: '',
    type: '',
    storageId: '',
    convoMemberId: ''
  }
];

export const convoMessagesData = [
  {
    publicId: '',
    convoId: '',
    subjectId: '',
    replyToId: '',
    author: '',
    body: '',
    postalMessageId: '',
    postalId: 0
  }
];

export const convoMessageRepliesData = [
  {
    convoMessageSourceId: '',
    convoMessageReplyId: '',
    convoDraftId: ''
  }
];

export const convoNotesData = [
  {
    publicId: '',
    convoId: '',
    replyToId: '',
    author: '',
    visibility: '',
    body: ''
  }
];

export const convoNoteReplies = [
  {
    convoNoteSourceId: '',
    convoNoteReplyId: ''
  }
];

export const convoDraftsData = [
  {
    publicId: '',
    convoId: '',
    replyToId: '',
    author: '',
    visibility: '',
    body: ''
  }
];
