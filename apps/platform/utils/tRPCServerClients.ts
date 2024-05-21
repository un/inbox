import { loggerLink } from '@trpc/client';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { TrpcMailBridgeRouter } from '@u22n/mail-bridge/trpc';
import type { TrpcBillingRouter } from '@uninbox-ee/billing/trpc';
import { env } from '~platform/env';

export const mailBridgeTrpcClient = createTRPCProxyClient<TrpcMailBridgeRouter>(
  {
    transformer: superjson,
    links: [
      loggerLink({
        enabled: (opts) =>
          env.NODE_ENV === 'development' &&
          opts.direction === 'down' &&
          opts.result instanceof Error
      }),
      httpBatchLink({
        url: `${env.MAILBRIDGE_URL}/trpc`,
        maxURLLength: 2083,
        headers() {
          return {
            Authorization: env.MAILBRIDGE_KEY
          };
        }
      })
    ]
  }
);

// TODO: Make this conditional on EE license. If no EE then it should not be available.
export const billingTrpcClient = createTRPCProxyClient<TrpcBillingRouter>({
  transformer: superjson,
  links: [
    loggerLink({
      enabled: (opts) =>
        (env.NODE_ENV === 'development' && typeof window !== 'undefined') ||
        (opts.direction === 'down' && opts.result instanceof Error)
    }),
    httpBatchLink({
      url: `${env.BILLING_URL}/trpc`,
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
