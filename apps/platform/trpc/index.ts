export * from '@trpc/server';
import { emailIdentityRouter } from './routers/orgRouter/mail/emailIdentityRouter';
import { orgProfileRouter } from './routers/orgRouter/setup/profileRouter';
import { orgMembersRouter } from './routers/orgRouter/users/membersRouter';
import { iCanHazRouter } from './routers/orgRouter/iCanHaz/iCanHazRouter';
import { invitesRouter } from './routers/orgRouter/users/invitesRouter';
import { billingRouter } from './routers/orgRouter/setup/billingRouter';
import { domainsRouter } from './routers/orgRouter/mail/domainsRouter';
import { contactsRouter } from './routers/contactRouter/contactRouter';
import { twoFactorRouter } from './routers/authRouter/twoFactorRouter';
import { passwordRouter } from './routers/authRouter/passwordRouter';
import { recoveryRouter } from './routers/authRouter/recoveryRouter';
import { securityRouter } from './routers/userRouter/securityRouter';
import { teamsRouter } from './routers/orgRouter/users/teamsRouter';
import { passkeyRouter } from './routers/authRouter/passkeyRouter';
import { profileRouter } from './routers/userRouter/profileRouter';
import { addressRouter } from './routers/userRouter/addressRouter';
import { storeRouter } from './routers/orgRouter/orgStoreRouter';
import { signupRouter } from './routers/authRouter/signupRouter';
import { convoRouter } from './routers/convoRouter/convoRouter';
import { crudRouter } from './routers/orgRouter/orgCrudRouter';
import { router } from './trpc';

const trpcPlatformAuthRouter = router({
  signup: signupRouter,
  passkey: passkeyRouter,
  password: passwordRouter,
  twoFactorAuthentication: twoFactorRouter,
  recovery: recoveryRouter
});

const trpcPlatformAccountRouter = router({
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
  teams: teamsRouter
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
  mail: trpcPlatformOrgMailRouter,
  store: storeRouter,
  iCanHaz: iCanHazRouter
});

export const trpcPlatformRouter = router({
  auth: trpcPlatformAuthRouter,
  account: trpcPlatformAccountRouter,
  org: trpcPlatformOrgRouter,
  convos: convoRouter
});

export type TrpcPlatformRouter = typeof trpcPlatformRouter;
