import { faker } from '@faker-js/faker';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';
import { and, eq, or } from './orm';
import {
  FixedUsersData,
  convoAttachmentsData,
  convoDraftsData,
  convoMembersData,
  convoMessageRepliesData,
  convoMessagesData,
  convoNoteRepliesData,
  convoNotesData,
  convoSubjectsData,
  convosData,
  domainVerificationsData,
  domainsData,
  emailIdentitiesAuthorizedUsersData,
  emailIdentitiesData,
  emailRoutingRulesData,
  emailRoutingRulesDestinationsData,
  foreignEmailIdentitiesData,
  foreignEmailIdentitiesReputationsData,
  foreignEmailIdentitiesScreenerStatusData,
  orgInvitationsData,
  orgMembersData,
  orgModulesData,
  orgPostalConfigsData,
  orgsData,
  postalServersData,
  sendAsExternalEmailIdentitiesData,
  sendAsExternalEmailIdentitiesAuthorizedUsersData,
  sendAsExternalEmailIdentitiesSmtpCredentialsData,
  sendAsExternalEmailIdentitiesVerificationData,
  userAuthIdentitiesData,
  userGroupMembersData,
  userGroupsData,
  userProfilesData,
  userProfilesToOrgsData,
  usersData,
  userIds
} from './seedData';
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
import { db } from './';

//! IMPORTANT: This file is only for development purposes, it should not be used in production
//! CHECK THE COMMENTS AT FOR REQUIRED FIELDS
// Register in the app for each type below, obtain your userId and profileId (not PublicId)

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

async function seedDb() {
  console.log('Seeding database...');
  console.time('⏱️ time');

  // Users
  const usersInsertData = usersData(userIds);
  for (const user of usersInsertData) {
    //@ts-ignore
    await db.insert(users).values([user]);
  }
  console.log('Users inserted');
  console.timeLog('⏱️ time');

  // Auth Identities
  const userAuthIdentitiesInsertData = userAuthIdentitiesData(userIds);
  for (const userAuthIdentity of userAuthIdentitiesInsertData) {
    //@ts-ignore
    await db.insert(userAuthIdentities).values([userAuthIdentity]);
  }
  console.log('Auth Identities inserted');
  console.timeLog('⏱️ time');

  // User Profiles
  const userProfilesInsertData = userProfilesData(userIds, userAvatarIds);
  for (const userProfile of userProfilesInsertData) {
    //@ts-ignore
    await db.insert(userProfiles).values([userProfile]);
  }
  console.log('User Profiles inserted');
  console.timeLog('⏱️ time');

  // Orgs
  const orgsInsertData = orgsData(userIds, fixedUsers, orgAvatarIds);
  for (const org of orgsInsertData) {
    //@ts-ignore
    await db.insert(orgs).values([org]);
  }
  console.log('Orgs inserted');
  console.timeLog('⏱️ time');

  //Org Members
  const orgMembersInsertData = orgMembersData(userIds, fixedUsers);
  for (const orgMember of orgMembersInsertData) {
    //@ts-ignore
    await db.insert(orgMembers).values([orgMember]);
  }
  console.log('Org Members inserted');
  console.timeLog('⏱️ time');

  // User profiles to orgs
  const userProfilesToOrgsInsertData = userProfilesToOrgsData(
    userIds,
    fixedUsers
  );
  for (const userProfileToOrg of userProfilesToOrgsInsertData) {
    //@ts-ignore
    await db.insert(userProfilesToOrgs).values([userProfileToOrg]);
  }
  console.log('User Profiles to Orgs inserted');
  console.timeLog('⏱️ time');

  // Org Invitations
  const orgInvitationsInsertData = orgInvitationsData(userIds, fixedUsers);
  //@ts-ignore
  for (const orgInvitation of orgInvitationsInsertData) {
    const inviteData = orgInvitation;
    //@ts-ignore
    inviteData.invitedAt = faker.date.past();
    //@ts-ignore
    inviteData.expiresAt = faker.date.future();
    //@ts-ignore
    inviteData.acceptedAt = faker.date.past();
    //@ts-ignore
    await db.insert(orgInvitations).values([inviteData]);
  }
  console.log('Org Invitations inserted');
  console.timeLog('⏱️ time');

  // Org Modules
  const orgModulesInsertData = orgModulesData();
  for (const orgModule of orgModulesInsertData) {
    //@ts-ignore
    orgModule.lastModifiedAt = faker.date.past();
    //@ts-ignore
    await db.insert(orgModules).values([orgModule]);
  }
  console.log('Org Modules inserted');
  console.timeLog('⏱️ time');

  // Org Postal Configs
  const orgPostalConfigsInsertData = orgPostalConfigsData();
  for (const orgPostalConfig of orgPostalConfigsInsertData) {
    //@ts-ignore
    await db.insert(orgPostalConfigs).values([orgPostalConfig]);
  }
  console.log('Org Postal Configs inserted');
  console.timeLog('⏱️ time');

  // User Group Data
  const userGroupsInsertData = userGroupsData();
  for (const userGroup of userGroupsInsertData) {
    //@ts-ignore
    await db.insert(userGroups).values([userGroup]);
  }
  console.log('User Groups inserted');
  console.timeLog('⏱️ time');

  // User Group Members
  const userGroupMembersInsertData = userGroupMembersData(userIds, fixedUsers);
  for (const userGroupMember of userGroupMembersInsertData) {
    //@ts-ignore
    await db.insert(userGroupMembers).values([userGroupMember]);
  }
  console.log('User Group Members inserted');
  console.timeLog('⏱️ time');

  // Domains
  const domainsInsertData = domainsData();
  for (const domain of domainsInsertData) {
    //@ts-ignore
    domain.statusUpdatedAt = faker.date.past();
    //@ts-ignore
    domain.lastDnsCheckAt = faker.date.past();
    //@ts-ignore
    await db.insert(domains).values([domain]);
  }
  console.log('Domains inserted');
  console.timeLog('⏱️ time');

  // Domain Verifications
  const domainVerificationsInsertData = domainVerificationsData();
  for (const domainVerification of domainVerificationsInsertData) {
    //@ts-ignore
    domainVerification.verifiedAt = faker.date.past();
    //@ts-ignore
    await db.insert(domainVerifications).values([domainVerification]);
  }
  console.log('Domain Verifications inserted');
  console.timeLog('⏱️ time');

  // Postal Servers
  const postalServersInsertData = postalServersData();
  for (const postalServer of postalServersInsertData) {
    //@ts-ignore
    await db.insert(postalServers).values([postalServer]);
  }
  console.log('Postal Servers inserted');
  console.timeLog('⏱️ time');

  // Foreign Email Identities
  const foreignEmailIdentitiesInsertData = foreignEmailIdentitiesData(
    foreignIdentityAvatarIds
  );
  for (const foreignEmailIdentity of foreignEmailIdentitiesInsertData) {
    //@ts-ignore
    await db.insert(foreignEmailIdentities).values([foreignEmailIdentity]);
  }
  console.log('Foreign Email Identities inserted');
  console.timeLog('⏱️ time');

  // Foreign Email Identities Reputations
  const foreignEmailIdentitiesReputationsInsertData =
    foreignEmailIdentitiesReputationsData();
  for (const foreignEmailIdentitiesReputation of foreignEmailIdentitiesReputationsInsertData) {
    //@ts-ignore
    await db
      .insert(foreignEmailIdentitiesReputations)
      //@ts-ignore
      .values([foreignEmailIdentitiesReputation]);
  }
  console.log('Foreign Email Identities Reputations inserted');
  console.timeLog('⏱️ time');

  // Foreign Email Identities Screener Status
  const foreignEmailIdentitiesScreenerStatusInsertData =
    foreignEmailIdentitiesScreenerStatusData();
  for (const foreignEmailIdentitiesScreenerStatusItem of foreignEmailIdentitiesScreenerStatusInsertData) {
    //@ts-ignore
    await db
      .insert(foreignEmailIdentitiesScreenerStatus)
      .values([foreignEmailIdentitiesScreenerStatusItem]);
  }
  console.log('Foreign Email Identities Screener Status inserted');
  console.timeLog('⏱️ time');

  // Send as external email identities
  const sendAsExternalEmailIdentitiesInsertData =
    sendAsExternalEmailIdentitiesData();
  for (const sendAsExternalEmailIdentity of sendAsExternalEmailIdentitiesInsertData) {
    //@ts-ignore
    await db
      .insert(sendAsExternalEmailIdentities)
      //@ts-ignore
      .values([sendAsExternalEmailIdentity]);
  }
  console.log('Send as external email identities inserted');
  console.timeLog('⏱️ time');

  // Send as external email identities verification Data
  const sendAsExternalEmailIdentitiesVerificationInsertData =
    sendAsExternalEmailIdentitiesVerificationData();
  for (const sendAsExternalEmailIdentitiesVerificationItem of sendAsExternalEmailIdentitiesVerificationInsertData) {
    //@ts-ignore
    await db
      .insert(sendAsExternalEmailIdentitiesVerification)
      //@ts-ignore
      .values([sendAsExternalEmailIdentitiesVerificationItem]);
  }
  console.log('Send as external email identities verification inserted');
  console.timeLog('⏱️ time');

  // Send as external email identities Smtp Credentials Data
  const sendAsExternalEmailIdentitiesSmtpCredentialsInsertData =
    sendAsExternalEmailIdentitiesSmtpCredentialsData();
  for (const sendAsExternalEmailIdentitiesSmtpCredential of sendAsExternalEmailIdentitiesSmtpCredentialsInsertData) {
    //@ts-ignore
    await db
      .insert(sendAsExternalEmailIdentitiesSmtpCredentials)
      //@ts-ignore
      .values([sendAsExternalEmailIdentitiesSmtpCredential]);
  }
  console.log('Send as external email identities Smtp Credentials inserted');
  console.timeLog('⏱️ time');

  // Send as external email identities authorized users Data
  const sendAsExternalEmailIdentitiesAuthorizedUsersInsertData =
    sendAsExternalEmailIdentitiesAuthorizedUsersData();
  for (const sendAsExternalEmailIdentitiesAuthorizedUser of sendAsExternalEmailIdentitiesAuthorizedUsersInsertData) {
    //@ts-ignore
    await db
      .insert(sendAsExternalEmailIdentitiesAuthorizedUsers)
      //@ts-ignore
      .values([sendAsExternalEmailIdentitiesAuthorizedUser]);
  }
  console.log('Send as external email identities authorized users inserted');
  console.timeLog('⏱️ time');

  // Email Identities
  const emailIdentitiesInsertData = emailIdentitiesData();
  for (const emailIdentity of emailIdentitiesInsertData) {
    //@ts-ignore
    await db.insert(emailIdentities).values([emailIdentity]);
  }
  console.log('Email Identities inserted');
  console.timeLog('⏱️ time');

  // Email Identities Authorized Users
  const emailIdentitiesAuthorizedUsersInsertData =
    emailIdentitiesAuthorizedUsersData();
  for (const emailIdentitiesAuthorizedUser of emailIdentitiesAuthorizedUsersInsertData) {
    //@ts-ignore
    await db
      .insert(emailIdentitiesAuthorizedUsers)
      //@ts-ignore
      .values([emailIdentitiesAuthorizedUser]);
  }
  console.log('Email Identities Authorized Users inserted');
  console.timeLog('⏱️ time');

  // Email Routing Rules
  const emailRoutingRulesInsertData = emailRoutingRulesData();
  for (const emailRoutingRule of emailRoutingRulesInsertData) {
    //@ts-ignore
    await db.insert(emailRoutingRules).values([emailRoutingRule]);
  }
  console.log('Email Routing Rules inserted');
  console.timeLog('⏱️ time');

  // Email Routing Rules Destinations
  const emailRoutingRulesDestinationsInsertData =
    emailRoutingRulesDestinationsData();
  for (const emailRoutingRulesDestination of emailRoutingRulesDestinationsInsertData) {
    //@ts-ignore
    await db
      .insert(emailRoutingRulesDestinations)
      //@ts-ignore
      .values([emailRoutingRulesDestination]);
  }
  console.log('Email Routing Rules Destinations inserted');
  console.timeLog('⏱️ time');

  // Convos
  const convosInsertData = convosData();
  for (const convo of convosInsertData) {
    //@ts-ignore
    convo.lastUpdatedAt = faker.date.past();
    //@ts-ignore
    await db.insert(convos).values([convo]);
  }
  console.log('Convos inserted');
  console.timeLog('⏱️ time');

  // convo subjects
  const convoSubjectsInsertData = convoSubjectsData();
  for (const convoSubject of convoSubjectsInsertData) {
    //@ts-ignore
    await db.insert(convoSubjects).values([convoSubject]);
  }
  console.log('Convo Subjects inserted');
  console.timeLog('⏱️ time');

  // convo members
  const convoMembersInsertData = convoMembersData();
  for (const convoMember of convoMembersInsertData) {
    //@ts-ignore
    await db.insert(convoMembers).values([convoMember]);
  }
  console.log('Convo Members inserted');
  console.timeLog('⏱️ time');

  // convo messages
  const convoMessagesInsertData = convoMessagesData();
  for (const convoMessage of convoMessagesInsertData) {
    //@ts-ignore
    await db.insert(convoMessages).values([convoMessage]);
  }
  console.log('Convo Messages inserted');
  console.timeLog('⏱️ time');

  // convo attachments
  const convoAttachmentsInsertData = convoAttachmentsData();
  for (const convoAttachment of convoAttachmentsInsertData) {
    //@ts-ignore
    await db.insert(convoAttachments).values([convoAttachment]);
  }
  console.log('Convo Attachments inserted');
  console.timeLog('⏱️ time');

  // convo message replies
  const convoMessageRepliesInsertData = convoMessageRepliesData();
  for (const convoMessageReply of convoMessageRepliesInsertData) {
    //@ts-ignore
    await db.insert(convoMessageReplies).values([convoMessageReply]);
  }
  console.log('Convo Message Replies inserted');
  console.timeLog('⏱️ time');

  // Convo notes
  const convoNotesInsertData = convoNotesData();
  for (const convoNote of convoNotesInsertData) {
    //@ts-ignore
    await db.insert(convoNotes).values([convoNote]);
  }
  console.log('Convo Notes inserted');
  console.timeLog('⏱️ time');

  // Convo note replies
  const convoNoteRepliesInsertData = convoNoteRepliesData();
  for (const convoNoteReply of convoNoteRepliesInsertData) {
    //@ts-ignore
    await db.insert(convoNoteReplies).values([convoNoteReply]);
  }
  console.log('Convo Note Replies inserted');
  console.timeLog('⏱️ time');

  // convo drafts
  const convoDraftsInsertData = convoDraftsData();
  for (const convoDraft of convoDraftsInsertData) {
    //@ts-ignore
    await db.insert(convoDrafts).values([convoDraft]);
  }
  console.log('Convo Drafts inserted');
  console.timeLog('⏱️ time');

  console.log('');
  console.log('');
  console.log('👏 All Done');

  console.timeEnd('⏱️ time');
}
seedDb();
