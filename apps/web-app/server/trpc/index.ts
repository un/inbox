export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { registrationRouter } from './routers/authRouter';
import { testRouter } from './routers/testRouter';
import { signupRouter } from './routers/signupRouter';
import { profileRouter } from './routers/userRouter/profileRouter';
import { crudRouter } from './routers/orgRouter/orgCrudRouter';
import { invitesRouter } from './routers/orgRouter/users/invitesRouter';
import { convoRouter } from './routers/convoRouter/convoRouter';
import { orgProfileRouter } from './routers/orgRouter/setup/profileRouter';
import { orgMembersRouter } from './routers/orgRouter/users/membersRouter';
import { domainsRouter } from './routers/orgRouter/mail/domainsRouter';
import { orgUserGroupsRouter } from './routers/orgRouter/users/groupsRouter';
import { emailIdentityRouter } from './routers/orgRouter/mail/emailIdentityRouter';

export const trpcWebAppContext = createContext;

const trpcWebAppUserRouter = router({
  profile: profileRouter
});

const trpcWebAppOrgSetupRouter = router({
  profile: orgProfileRouter
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
  setup: trpcWebAppOrgSetupRouter,
  users: trpcWebAppOrgUsersRouter,
  mail: trpcWebAppOrgMailRouter
});

const trpcWebAppConvoRouter = router({
  convos: convoRouter
});

export const trpcWebAppRouter = router({
  signup: signupRouter,
  auth: registrationRouter,
  user: trpcWebAppUserRouter,
  org: trpcWebAppOrgRouter,
  convos: convoRouter,
  test: testRouter
});

export type TrpcWebAppRouter = typeof trpcWebAppRouter;
