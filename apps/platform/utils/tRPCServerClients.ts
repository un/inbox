import { loggerLink } from '@trpc/client';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { TrpcMailBridgeRouter } from '@u22n/types';
import type { TrpcBillingRouter } from '@uninbox-ee/types/trpc';
import { useRuntimeConfig } from '#imports';

const config = useRuntimeConfig();
export const mailBridgeTrpcClient = createTRPCProxyClient<TrpcMailBridgeRouter>(
  {
    transformer: superjson,
    links: [
      loggerLink({
        enabled: (opts) =>
          (process.env.NODE_ENV === 'development' &&
            typeof window !== 'undefined') ||
          (opts.direction === 'down' && opts.result instanceof Error)
      }),
      httpBatchLink({
        url: `${config.mailBridge.url}/trpc`,
        maxURLLength: 2083,
        headers() {
          return {
            Authorization: config.mailBridge.key as string
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
        (process.env.NODE_ENV === 'development' &&
          typeof window !== 'undefined') ||
        (opts.direction === 'down' && opts.result instanceof Error)
    }),
    httpBatchLink({
      url: `${config.billing.url}/trpc`,
      maxURLLength: 2083,
      headers() {
        return {
          Authorization: config.billing.key as string
        };
      }
    })
  ]
});
