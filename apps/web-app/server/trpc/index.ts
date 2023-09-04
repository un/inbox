export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { registrationRouter } from './routers/authRouter';
import { testRouter } from './routers/testRouter';
import { signupRouter } from './routers/signupRouter';
import { profileRouter } from './routers/userRouter';

export const trpcWebAppContext = createContext;

const trpcWebAppUserRouter = router({
  profile: profileRouter
});

export const trpcWebAppRouter = router({
  signup: signupRouter,
  auth: registrationRouter,
  user: trpcWebAppUserRouter,
  test: testRouter
});

export type TrpcWebAppRouter = typeof trpcWebAppRouter;
