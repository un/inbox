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
const randomDate = faker.date.past().toDateString();

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
  userIds: number[],
  fixedUsers: FixedUsersData
) => {
  const orgInvitations: object[] = [];

  for (let i = 0; i < 2; i++) {
    orgInvitations.push(
      {
        publicId: nanoId(),
        orgId: 100,
        invitedByUserId: fixedUsers.admin.userId,
        role: 'member',
        //invitedUser: '',
        email: faker.internet.email(),
        inviteToken: nanoIdToken()
        // invitedAt: faker.date.past(),
        // expiresAt: faker.date.future(),
        // acceptedAt: ''
      },
      {
        publicId: nanoId(),
        orgId: 100,
        invitedByUserId: fixedUsers.admin.userId,
        role: 'member',
        invitedUser: userIds[Math.floor(Math.random() * userIds.length)],
        email: faker.internet.email(),
        inviteToken: nanoIdToken()
        // invitedAt: faker.date.past(),
        // expiresAt: faker.date.future(),
        // acceptedAt: faker.date.future()
      },
      {
        publicId: nanoId(),
        orgId: 101,
        invitedByUserId: fixedUsers.admin.userId,
        role: 'member',
        //invitedUser: '',
        email: faker.internet.email(),
        inviteToken: nanoIdToken()
        // invitedAt: faker.date.past(),
        // expiresAt: faker.date.future(),
        // acceptedAt: ''
      },
      {
        publicId: nanoId(),
        orgId: 101,
        invitedByUserId: fixedUsers.admin.userId,
        role: 'member',
        invitedUser: userIds[Math.floor(Math.random() * userIds.length)],
        email: faker.internet.email(),
        inviteToken: nanoIdToken()
        // invitedAt: faker.date.past(),
        // expiresAt: faker.date.future(),
        // acceptedAt: faker.date.future()
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
  userIds: number[],
  fixedUsers: FixedUsersData
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

export const foreignEmailIdentitiesData = (
  foreignIdentityAvatarIds: string[]
) => {
  const foreignEmailIdentities: object[] = [];

  for (let i = 0; i < 30; i++) {
    foreignEmailIdentities.push({
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
  return foreignEmailIdentities;
};

export const foreignEmailIdentitiesReputationsData = () => {
  const foreignEmailIdentitiesReputations: object[] = [];
  for (let i = 0; i < 30; i++) {
    foreignEmailIdentitiesReputations.push({
      identityId: 100 + i,
      spam: Math.floor(Math.random() * 10),
      cold: Math.floor(Math.random() * 10)
    });
  }
  return foreignEmailIdentitiesReputations;
};

export const foreignEmailIdentitiesScreenerStatusData = () => {
  const foreignEmailIdentitiesScreenerStatus: object[] = [];
  const screenerStatus = ['pending', 'approve', 'reject', 'delete'];
  for (let i = 0; i < 30; i++) {
    foreignEmailIdentitiesScreenerStatus.push({
      id: 100 + i,
      publicId: nanoId(),
      orgId: 100,
      foreignIdentityId: 100 + i,
      emailIdentityId: 100 + i,
      status: screenerStatus[Math.floor(Math.random() * screenerStatus.length)],
      level: 'emailIdentity',
      setByUserId: Math.floor(Math.random() * 30) + 100
    });
  }
  return foreignEmailIdentitiesScreenerStatus;
};

export const sendAsExternalEmailIdentitiesData = () => {
  const sendAsExternalEmailIdentities: object[] = [];
  for (let i = 0; i < 5; i++) {
    sendAsExternalEmailIdentities.push(
      {
        id: 100 + i,
        publicId: nanoId(),
        orgId: 100,
        verified: true,
        username: faker.internet.userName(),
        domain: faker.internet.domainName(),
        sendName: faker.person.fullName(),
        smtpCredentialsId: 100 + i,
        addedBy: Math.floor(Math.random() * 30) + 100
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
        addedBy: Math.floor(Math.random() * 30) + 100
      }
    );
  }
  return sendAsExternalEmailIdentities;
};

export const sendAsExternalEmailIdentitiesVerificationData = () => {
  const sendAsExternalEmailIdentitiesVerification: object[] = [];
  for (let i = 0; i < 10; i++) {
    sendAsExternalEmailIdentitiesVerification.push({
      identityId: 100 + i,
      verificationToken: nanoIdToken(),
      verifiedAt: faker.date.past()
    });
  }
  return sendAsExternalEmailIdentitiesVerification;
};

export const sendAsExternalEmailIdentitiesSmtpCredentialsData = () => {
  const sendAsExternalEmailIdentitiesSmtpCredentials: object[] = [];
  for (let i = 0; i < 10; i++) {
    sendAsExternalEmailIdentitiesSmtpCredentials.push({
      id: 100 + i,
      username: faker.internet.userName(),
      password: faker.internet.password(),
      host: faker.internet.domainName(),
      port: 587,
      authMethod: 'plain',
      encryption: 'tls',
      addedBt: 100 + i
    });
  }
  return sendAsExternalEmailIdentitiesSmtpCredentials;
};

export const sendAsExternalEmailIdentitiesAuthorizedUsersData = () => {
  const sendAsExternalEmailIdentitiesAuthorizedUsers: object[] = [];
  for (let i = 0; i < 10; i++) {
    sendAsExternalEmailIdentitiesAuthorizedUsers.push(
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
    );
  }
  return sendAsExternalEmailIdentitiesAuthorizedUsers;
};

export const emailIdentitiesData = () => {
  const emailIdentities: object[] = [];
  for (let i = 0; i < 30; i++) {
    emailIdentities.push(
      {
        id: 100 + i,
        publicId: nanoId(),
        orgId: 100,
        username: faker.internet.userName(),
        domainName: faker.internet.domainName(),
        domainId: 100,
        sendName: faker.person.fullName(),
        addedBy: 100
      },
      {
        id: 100 + i + 30,
        publicId: nanoId(),
        orgId: 100,
        username: faker.internet.userName(),
        domainName: faker.internet.domainName(),
        domainId: 101,
        sendName: faker.person.fullName(),
        addedBy: 100
      },
      {
        id: 200 + i,
        publicId: nanoId(),
        orgId: 101,
        username: faker.internet.userName(),
        domainName: faker.internet.domainName(),
        domainId: 102,
        sendName: faker.person.fullName(),
        addedBy: 101
      },
      {
        id: 200 + i + 30,
        publicId: nanoId(),
        orgId: 101,
        username: faker.internet.userName(),
        domainName: faker.internet.domainName(),
        domainId: 103,
        sendName: faker.person.fullName(),
        addedBy: 102
      }
    );
  }
  return emailIdentities;
};

export const emailIdentitiesAuthorizedUsersData = () => {
  const emailIdentitiesAuthorizedUsers: object[] = [];
  for (let i = 0; i < 30; i++) {
    emailIdentitiesAuthorizedUsers.push(
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
    );
  }
  for (let i = 0; i < 6; i++) {
    emailIdentitiesAuthorizedUsers.push(
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
    );
  }
  return emailIdentitiesAuthorizedUsers;
};

export const emailRoutingRulesData = () => {
  const emailRoutingRules: object[] = [];
  for (let i = 0; i < 30; i++) {
    emailRoutingRules.push(
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
        addedBy: 101
      }
    );
  }
  return emailRoutingRules;
};

export const emailRoutingRulesDestinationsData = () => {
  const emailRoutingRulesDestinations: object[] = [];
  for (let i = 0; i < 30; i++) {
    emailRoutingRulesDestinations.push(
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
    );
  }
  return emailRoutingRulesDestinations;
};

export const convosData = () => {
  const convos: object[] = [];
  const screenerStatuses = ['pending', 'approved', 'rejected', 'deleted'];
  for (let i = 0; i < 50; i++) {
    convos.push(
      {
        id: 100 + i,
        publicId: nanoId(),
        orgId: 100,
        lastUpdatedAt: faker.date.past(),
        screenerStatus:
          screenerStatuses[Math.floor(Math.random() * screenerStatuses.length)]
      },
      {
        id: 200 + i,
        publicId: nanoId(),
        orgId: 101,
        lastUpdatedAt: faker.date.past(),
        screenerStatus:
          screenerStatuses[Math.floor(Math.random() * screenerStatuses.length)]
      }
    );
  }
  return convos;
};

export const convoSubjectsData = () => {
  const convoSubjects: object[] = [];
  for (let i = 0; i < 50; i++) {
    convoSubjects.push(
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
    );
  }
  for (let i = 0; i < 20; i++) {
    convoSubjects.push(
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
    );
  }
  return convoSubjects;
};

export const convoMembersData = () => {
  const convoMembers: object[] = [];
  const convoRoles = ['assigned', 'contributor', 'watcher', 'guest'];
  const convoNotifications = ['active', 'muted', 'off'];
  const userIds = Array(30)
    .fill(0)
    .map((_, i) => i + 100);
  const groupIds1 = [100, 101, 102];
  const groupIds2 = [103, 104, 105];
  for (let i = 0; i < 50; i++) {
    const user1 = userIds[Math.floor(Math.random() * userIds.length)];
    const user2 = userIds[Math.floor(Math.random() * userIds.length)];
    convoMembers.push(
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
        id: 100 + i * 2,
        convoId: 100 + i,
        userGroupId: groupIds1[Math.floor(Math.random() * groupIds1.length)],
        role: convoRoles[Math.floor(Math.random() * convoRoles.length)],
        notifications:
          convoNotifications[
            Math.floor(Math.random() * convoNotifications.length)
          ]
      },
      {
        id: 1000 + i,
        convoId: 100 + i,
        foreignEmailIdentityId: 100 + i,
        role: 'contributor',
        notifications: 'active'
      },
      {
        id: 200 + i,
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
        id: 200 + i * 2,
        convoId: 200 + i,
        userGroupId: groupIds2[Math.floor(Math.random() * groupIds2.length)],
        role: convoRoles[Math.floor(Math.random() * convoRoles.length)],
        notifications:
          convoNotifications[
            Math.floor(Math.random() * convoNotifications.length)
          ]
      },
      {
        id: 2000 + i,
        convoId: 200 + i,
        foreignEmailIdentityId: 100 + i,
        role: 'contributor',
        notifications: 'active'
      }
    );
  }

  return convoMembers;
};

export const convoMessagesData = () => {
  const convoMessages: object[] = [];
  const convoIds = Array.from({ length: 50 }, (_, i) => i + 100);
  const convoIds2 = Array.from({ length: 50 }, (_, i) => i + 200);
  const convoSubjects = [
    ...Array.from({ length: 50 }, (_, i) => i + 100),
    ...Array.from({ length: 50 }, (_, i) => i + 200),
    ...Array.from({ length: 20 }, (_, i) => i + 300),
    ...Array.from({ length: 20 }, (_, i) => i + 400)
  ];
  const convoMembers = [
    ...Array.from({ length: 100 }, (_, i) => i + 100),
    ...Array.from({ length: 100 }, (_, i) => i + 200),
    ...Array.from({ length: 50 }, (_, i) => i + 1000),
    ...Array.from({ length: 50 }, (_, i) => i + 2000)
  ];
  for (let i = 0; i < 1000; i++) {
    convoMessages.push(
      {
        id: 1000 + i,
        publicId: nanoId(),
        convoId: convoIds[Math.floor(Math.random() * 50)],
        subjectId: convoSubjects[Math.floor(Math.random() * 140)],
        replyToId: '',
        author: convoMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        postalMessageId: faker.string.uuid(),
        postalId: faker.string.numeric()
      },
      {
        id: 3000 + i,
        publicId: nanoId(),
        convoId: convoIds2[Math.floor(Math.random() * 50)],
        subjectId: convoSubjects[Math.floor(Math.random() * 140)],
        replyToId: '',
        author: convoMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        postalMessageId: faker.string.uuid(),
        postalId: faker.string.numeric()
      }
    );
  }
  for (let i = 0; i < 300; i++) {
    convoMessages.push(
      {
        id: 5000 + i,
        publicId: nanoId(),
        convoId: convoIds[Math.floor(Math.random() * 50)],
        subjectId: convoSubjects[Math.floor(Math.random() * 140)],
        replyToId: 1000 + i * 2,
        author: convoMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        postalMessageId: faker.string.uuid(),
        postalId: faker.string.numeric()
      },
      {
        id: 6000 + i,
        publicId: nanoId(),
        convoId: convoIds2[Math.floor(Math.random() * 50)],
        subjectId: convoSubjects[Math.floor(Math.random() * 140)],
        replyToId: 3000 + i * 2,
        author: convoMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        postalMessageId: faker.string.uuid(),
        postalId: faker.string.numeric()
      }
    );
  }

  return convoMessages;
};

export const convoAttachmentsData = () => {
  const convoAttachments: object[] = [];
  const convoMessageIds = Array.from({ length: 1001 }, (_, i) => i);
  const convoMembers = [
    ...Array.from({ length: 100 }, (_, i) => i + 100),
    ...Array.from({ length: 100 }, (_, i) => i + 200),
    ...Array.from({ length: 50 }, (_, i) => i + 1000),
    ...Array.from({ length: 50 }, (_, i) => i + 2000)
  ];

  for (let i = 0; i < 25; i++) {
    convoAttachments.push(
      {
        id: 100 + i,
        publicId: nanoId(),
        convoId: 100 + i * 2,
        convoMessageId: convoMessageIds[Math.floor(Math.random() * 1000)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 100 + i * 3
      },
      {
        id: 100 + i * 2,
        publicId: nanoId(),
        convoId: 100 + i * 2,
        convoNoteId: convoMessageIds[Math.floor(Math.random() * 1000)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 100 + i * 3
      },
      {
        id: 100 + i * 3,
        publicId: nanoId(),
        convoId: 100 + i * 2,
        convoDraftId: convoMessageIds[Math.floor(Math.random() * 1000)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 100 + i * 3
      },
      {
        id: 200 + i,
        publicId: nanoId(),
        convoId: 200 + i * 2,
        convoMessageId: convoMessageIds[Math.floor(Math.random() * 1000)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 200 + i * 3
      },
      {
        id: 200 + i * 2,
        publicId: nanoId(),
        convoId: 200 + i * 2,
        convoNoteId: convoMessageIds[Math.floor(Math.random() * 1000)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 200 + i * 3
      },
      {
        id: 200 + i * 3,
        publicId: nanoId(),
        convoId: 200 + i * 2,
        convoDraftId: convoMessageIds[Math.floor(Math.random() * 1000)],
        fileName: faker.system.fileName(),
        type: faker.system.fileType(),
        storageId: faker.string.uuid(),
        convoMemberId: 200 + i * 3
      }
    );
  }
  return convoAttachments;
};

export const convoMessageRepliesData = () => {
  const convoMessageReplies: object[] = [];
  for (let i = 0; i < 300; i++) {
    convoMessageReplies.push(
      {
        convoMessageSourceId: 1000 + i * 2,
        convoMessageReplyId: 5000 + i
      },
      {
        convoMessageSourceId: 3000 + i * 2,
        convoMessageReplyId: 6000 + i
      }
    );
  }
  return convoMessageReplies;
};

export const convoNotesData = () => {
  const convoNotes: object[] = [];
  const convoIds = Array.from({ length: 50 }, (_, i) => i + 100);
  const convoIds2 = Array.from({ length: 50 }, (_, i) => i + 200);
  const convoMembers = [
    ...Array.from({ length: 100 }, (_, i) => i + 100),
    ...Array.from({ length: 100 }, (_, i) => i + 200),
    ...Array.from({ length: 50 }, (_, i) => i + 1000),
    ...Array.from({ length: 50 }, (_, i) => i + 2000)
  ];
  const noteVisibility = ['self', 'convo', 'org', 'public'];

  for (let i = 0; i < 1000; i++) {
    convoNotes.push(
      {
        id: 1000 + i,
        publicId: nanoId(),
        convoId: convoIds[Math.floor(Math.random() * 50)],
        replyToId: '',
        author: convoMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        visibility: noteVisibility[Math.floor(Math.random() * 4)]
      },
      {
        id: 3000 + i,
        publicId: nanoId(),
        convoId: convoIds2[Math.floor(Math.random() * 50)],
        author: convoMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        visibility: noteVisibility[Math.floor(Math.random() * 4)]
      }
    );
  }
  for (let i = 0; i < 300; i++) {
    convoNotes.push(
      {
        id: 5000 + i,
        publicId: nanoId(),
        convoId: convoIds[Math.floor(Math.random() * 50)],
        replyToId: 1000 + i * 2,
        author: convoMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        visibility: noteVisibility[Math.floor(Math.random() * 4)]
      },
      {
        id: 6000 + i,
        publicId: nanoId(),
        convoId: convoIds2[Math.floor(Math.random() * 50)],
        replyToId: 3000 + i * 2,
        author: convoMembers[Math.floor(Math.random() * 300)],
        body: faker.lorem.sentences(),
        visibility: noteVisibility[Math.floor(Math.random() * 4)]
      }
    );
  }
  return convoNotes;
};

export const convoNoteRepliesData = () => {
  const convoNoteReplies: object[] = [];
  for (let i = 0; i < 300; i++) {
    convoNoteReplies.push(
      {
        convoNoteSourceId: 1000 + i * 2,
        convoNoteReplyId: 5000 + i
      },
      {
        convoNoteSourceId: 3000 + i * 2,
        convoNoteReplyId: 6000 + i
      }
    );
  }
  return convoNoteReplies;
};

export const convoDraftsData = () => {
  const convoDrafts: object[] = [];
  const convoIds = Array.from({ length: 50 }, (_, i) => i + 100);
  const convoIds2 = Array.from({ length: 50 }, (_, i) => i + 200);
  const convoMembers = [
    ...Array.from({ length: 100 }, (_, i) => i + 100),
    ...Array.from({ length: 100 }, (_, i) => i + 200),
    ...Array.from({ length: 50 }, (_, i) => i + 1000),
    ...Array.from({ length: 50 }, (_, i) => i + 2000)
  ];
  const draftVisibility = ['self', 'convo', 'org', 'public'];

  for (let i = 0; i < 200; i++) {
    convoDrafts.push(
      {
        id: 1000 + i,
        publicId: nanoId(),
        convoId: convoIds[Math.floor(Math.random() * 50)],
        author: convoMembers[Math.floor(Math.random() * 300)],
        visibility: draftVisibility[Math.floor(Math.random() * 4)],
        body: faker.lorem.sentences()
      },
      {
        id: 2000 + i,
        publicId: nanoId(),
        convoId: convoIds2[Math.floor(Math.random() * 50)],
        author: convoMembers[Math.floor(Math.random() * 300)],
        visibility: draftVisibility[Math.floor(Math.random() * 4)],
        body: faker.lorem.sentences()
      }
    );
  }
  return convoDrafts;
};
