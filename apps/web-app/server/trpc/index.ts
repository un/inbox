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

export const trpcWebAppContext = createContext;

const trpcWebAppUserRouter = router({
  profile: profileRouter
});
const trpcWebAppOrgRouter = router({
  settings: settingsRouter,
  invites: invitesRouter
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
