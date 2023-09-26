export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { registrationRouter } from './routers/authRouter';
import { testRouter } from './routers/testRouter';
import { signupRouter } from './routers/signupRouter';
import { profileRouter } from './routers/userRouter/profileRouter';
import { settingsRouter } from './routers/orgRouter/settingsRouter';
import { invitesRouter } from './routers/orgRouter/invitesRouter';
import { convoRouter } from './routers/convoRouter/convoRouter';
import { orgProfileRouter } from './routers/orgRouter/profileRouter';
import { orgMembersRouter } from './routers/orgRouter/membersRouter';
import { domainsRouter } from './routers/orgRouter/mail/domainsRouter';
import { orgUserGroupsRouter } from './routers/orgRouter/groupsRouter';

export const trpcWebAppContext = createContext;

const trpcWebAppUserRouter = router({
  profile: profileRouter
});
const trpcWebAppOrgMailRouter = router({
  domains: domainsRouter
});

const trpcWebAppOrgRouter = router({
  settings: settingsRouter,
  profile: orgProfileRouter,
  invites: invitesRouter,
  members: orgMembersRouter,
  mail: trpcWebAppOrgMailRouter,
  userGroups: orgUserGroupsRouter
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
