export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { authRouter } from './routers/authRouter';
import { testRouter } from './routers/testRouter';
import { signupRouter } from './routers/signupRouter';
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

export const trpcWebAppContext = createContext;

const trpcWebAppUserRouter = router({
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
  signup: signupRouter,
  auth: authRouter,
  user: trpcWebAppUserRouter,
  org: trpcWebAppOrgRouter,
  convos: convoRouter,
  test: testRouter
});

export type TrpcWebAppRouter = typeof trpcWebAppRouter;
