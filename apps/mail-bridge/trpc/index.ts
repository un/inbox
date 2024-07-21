export * from '@trpc/server';
import { sendMailRouter } from './routers/sendMailRouter';
import { domainRouter } from './routers/domainRouter';
import { smtpRouter } from './routers/smtpRouter';
import { orgRouter } from './routers/orgRouter';
import { router } from './trpc';

export const trpcMailBridgePostalRouter = router({
  org: orgRouter,
  domains: domainRouter
});
export const trpcMailBridgeMailRouter = router({
  send: sendMailRouter
});
export const trpcMailBridgeRouter = router({
  mail: trpcMailBridgeMailRouter,
  postal: trpcMailBridgePostalRouter,
  smtp: smtpRouter
});

export type TrpcMailBridgeRouter = typeof trpcMailBridgeRouter;
