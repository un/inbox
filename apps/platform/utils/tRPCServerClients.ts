import type { TrpcMailBridgeRouter } from '@u22n/mail-bridge/trpc';
import type { TrpcBillingRouter } from '@uninbox-ee/billing/trpc';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { loggerLink } from '@trpc/client';
import { env } from '~platform/env';
import SuperJSON from 'superjson';

export const mailBridgeTrpcClient = createTRPCClient<TrpcMailBridgeRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        env.NODE_ENV === 'development' &&
        opts.direction === 'down' &&
        opts.result instanceof Error
    }),
    httpBatchLink({
      url: `${env.MAILBRIDGE_URL}/trpc`,
      transformer: SuperJSON,
      maxURLLength: 2083,
      headers() {
        return {
          Authorization: env.MAILBRIDGE_KEY
        };
      }
    })
  ]
});

// TODO: Make this conditional on EE license. If no EE then it should not be available.
export const billingTrpcClient = createTRPCClient<TrpcBillingRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error)
    }),
    httpBatchLink({
      url: `${env.BILLING_URL}/trpc`,
      transformer: SuperJSON,
      maxURLLength: 2083,
      headers() {
        if (!env.BILLING_KEY) {
          throw new Error('Tried to use billing client without key');
        }
        return {
          Authorization: env.BILLING_KEY
        };
      }
    })
  ]
});
