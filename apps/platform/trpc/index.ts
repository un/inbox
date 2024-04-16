export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { passkeyRouter } from './routers/authRouter/passkeyRouter';
import { passwordRouter } from './routers/authRouter/passwordRouter';
import { signupRouter } from './routers/authRouter/signupRouter';
import { recoveryRouter } from './routers/authRouter/recoveryRouter';
import { profileRouter } from './routers/userRouter/profileRouter';
import { crudRouter } from './routers/orgRouter/orgCrudRouter';
import { invitesRouter } from './routers/orgRouter/users/invitesRouter';
import { convoRouter } from './routers/convoRouter/convoRouter';
import { contactsRouter } from './routers/contactRouter/contactRouter';
import { orgProfileRouter } from './routers/orgRouter/setup/profileRouter';
import { orgMembersRouter } from './routers/orgRouter/users/membersRouter';
import { domainsRouter } from './routers/orgRouter/mail/domainsRouter';
import { groupsRouter } from './routers/orgRouter/users/groupsRouter';
import { emailIdentityRouter } from './routers/orgRouter/mail/emailIdentityRouter';
import { billingRouter } from './routers/orgRouter/setup/billingRouter';
import { addressRouter } from './routers/userRouter/addressRouter';
import { defaultsRouter } from './routers/userRouter/defaultsRouter';
import { twoFactorRouter } from './routers/authRouter/twoFactorRouter';
import { securityRouter } from './routers/userRouter/securityRouter';

export const trpcPlatformContext = createContext;

const trpcPlatformAuthRouter = router({
  signup: signupRouter,
  passkey: passkeyRouter,
  password: passwordRouter,
  twoFactorAuthentication: twoFactorRouter,
  recovery: recoveryRouter
});

const trpcPlatformAccountRouter = router({
  defaults: defaultsRouter,
  profile: profileRouter,
  addresses: addressRouter,
  security: securityRouter
});

const trpcPlatformOrgSetupRouter = router({
  profile: orgProfileRouter,
  billing: billingRouter
});
const trpcPlatformOrgUsersRouter = router({
  invites: invitesRouter,
  members: orgMembersRouter,
  groups: groupsRouter
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
  account: trpcPlatformAccountRouter,
  org: trpcPlatformOrgRouter,
  convos: convoRouter
});

export type TrpcPlatformRouter = typeof trpcPlatformRouter;
