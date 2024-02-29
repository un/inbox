export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { emailRouter } from './routers/authRouter/emailRouter';
import { passkeyRouter } from './routers/authRouter/passkeyRouter';
import { passwordRouter } from './routers/authRouter/passwordRouter';
import { testRouter } from './routers/testRouter';
import { signupRouter } from './routers/authRouter/signupRouter';
import { profileRouter } from './routers/userRouter/profileRouter';
import { crudRouter } from './routers/orgRouter/orgCrudRouter';
import { invitesRouter } from './routers/orgRouter/users/invitesRouter';
import { convoRouter } from './routers/convoRouter/convoRouter';
import { contactsRouter } from './routers/contactRouter/contactRouter';
import { orgProfileRouter } from './routers/orgRouter/setup/profileRouter';
import { orgMembersRouter } from './routers/orgRouter/users/membersRouter';
import { domainsRouter } from './routers/orgRouter/mail/domainsRouter';
import { orgUserGroupsRouter } from './routers/orgRouter/users/groupsRouter';
import { emailIdentityRouter } from './routers/orgRouter/mail/emailIdentityRouter';
import { billingRouter } from './routers/orgRouter/setup/billingRouter';
import { addressRouter } from './routers/userRouter/addressRouter';
import { defaultsRouter } from './routers/userRouter/defaultsRouter';

export const trpcPlatformContext = createContext;

const trpcPlatformAuthRouter = router({
  signup: signupRouter,
  email: emailRouter,
  passkey: passkeyRouter,
  password: passwordRouter
});

const trpcPlatformUserRouter = router({
  defaults: defaultsRouter,
  profile: profileRouter,
  addresses: addressRouter
});

const trpcPlatformOrgSetupRouter = router({
  profile: orgProfileRouter,
  billing: billingRouter
});
const trpcPlatformOrgUsersRouter = router({
  invites: invitesRouter,
  members: orgMembersRouter,
  userGroups: orgUserGroupsRouter
});
const trpcPlatformOrgMailRouter = router({
  domains: domainsRouter,
  emailIdentities: emailIdentityRouter
});

const trpcPlatformOrgRouter = router({
  crud: crudRouter,
  contacts: contactsRouter,
  setup: trpcPlatformOrgSetupRouter,
  users: trpcPlatformOrgUsersRouter,
  mail: trpcPlatformOrgMailRouter
});

export const trpcPlatformRouter = router({
  auth: trpcPlatformAuthRouter,
  user: trpcPlatformUserRouter,
  org: trpcPlatformOrgRouter,
  convos: convoRouter,
  test: testRouter
});

export type TrpcPlatformRouter = typeof trpcPlatformRouter;
