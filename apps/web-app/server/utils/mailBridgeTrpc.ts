import { loggerLink } from '@trpc/client';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { TrpcMailBridgeRouter } from '@uninbox/types/trpc';

const config = useRuntimeConfig();
export const mailBridgeTrpcClient = createTRPCProxyClient<TrpcMailBridgeRouter>(
  {
    transformer: superjson,
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === 'development' ||
          (opts.direction === 'down' && opts.result instanceof Error)
      }),
      httpBatchLink({
        fetch: (input, options) =>
          globalThis.$fetch
            //@ts-ignore no idea why its causing type issues on options.method
            .raw(input.toString(), options?.method)
            .catch((e) => {
              if (e && e.response) return e.response;

              throw e;
            })
            .then((response) => ({
              ...response,
              json: () => Promise.resolve(response._data)
            })),
        url: `${config.mailBridgeUrl}/trpc`,
        maxURLLength: 2083,
        headers() {
          return {
            Authorization: config.mailBridgeKey as string
          };
        }
      })
    ]
  }
);
