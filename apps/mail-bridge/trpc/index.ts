export * from '@trpc/server';
import { router } from './trpc';
import { orgRouter } from './routers/orgRouter';
import { domainRouter } from './routers/domainRouter';
import { sendMailRouter } from './routers/sendMailRouter';
import { smtpRouter } from './routers/smtpRouter';

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
