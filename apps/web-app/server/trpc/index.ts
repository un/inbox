export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { emailRouter } from './routers/authRouter/emailRouter';
import { passkeyRouter } from './routers/authRouter/passkeyRouter';
import { passwordRouter } from './routers/authRouter/passwordRouter';
import { securityRouter } from './routers/authRouter/securityRouter';
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

export const trpcWebAppContext = createContext;

const trpcWebAppAuthRouter = router({
  signup: signupRouter,
  email: emailRouter,
  passkey: passkeyRouter,
  password: passwordRouter,
  security: securityRouter
});

const trpcWebAppUserRouter = router({
  defaults: defaultsRouter,
  profile: profileRouter,
  addresses: addressRouter
});

const trpcWebAppOrgSetupRouter = router({
  profile: orgProfileRouter,
  billing: billingRouter
});
const trpcWebAppOrgUsersRouter = router({
  invites: invitesRouter,
  members: orgMembersRouter,
  userGroups: orgUserGroupsRouter
});
const trpcWebAppOrgMailRouter = router({
  domains: domainsRouter,
  emailIdentities: emailIdentityRouter
});

const trpcWebAppOrgRouter = router({
  crud: crudRouter,
  contacts: contactsRouter,
  setup: trpcWebAppOrgSetupRouter,
  users: trpcWebAppOrgUsersRouter,
  mail: trpcWebAppOrgMailRouter
});

export const trpcWebAppRouter = router({
  auth: trpcWebAppAuthRouter,
  user: trpcWebAppUserRouter,
  org: trpcWebAppOrgRouter,
  convos: convoRouter,
  test: testRouter
});

export type TrpcWebAppRouter = typeof trpcWebAppRouter;
