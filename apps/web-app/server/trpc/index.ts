export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { registrationRouter } from './routers/authRouter';
import { testRouter } from './routers/testRouter';

export const trpcWebAppContext = createContext;
export const trpcWebAppRouter = router({
  auth: registrationRouter,
  test: testRouter
});

export type TrpcWebAppRouter = typeof trpcWebAppRouter;
