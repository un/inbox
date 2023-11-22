import { loggerLink } from '@trpc/client';
import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client';
import superjson from 'superjson';
import type { TrpcWebAppRouter } from '../server/trpc';
import type { TrpcMailBridgeRouter } from '@uninbox/types/trpc';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const orgSlug = useRoute().params.orgSlug as string;
  const trpcWebAppClient = createTRPCNuxtClient<TrpcWebAppRouter>({
    transformer: superjson,
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === 'development' ||
          (opts.direction === 'down' && opts.result instanceof Error)
      }),
      httpBatchLink({
        url: '/api/trpc',
        maxURLLength: 2083,
        headers() {
          return {
            'org-slug': orgSlug
          };
        }
      })
    ]
  });
  // const trpcMailBridgeClient = createTRPCNuxtClient<TrpcMailBridgeRouter>({
  //   transformer: superjson,
  //   links: [
  //     loggerLink({
  //       enabled: (opts) =>
  //         process.env.NODE_ENV === 'development' ||
  //         (opts.direction === 'down' && opts.result instanceof Error)
  //     }),
  //     httpBatchLink({
  //       url: `${config.mailBridge.url}/trpc`,
  //       maxURLLength: 2083,
  //       headers() {
  //         return {
  //           Authorization: config.mailBridge.key as string
  //         };
  //       }
  //     })
  //   ]
  // });

  return {
    provide: {
      trpc: trpcWebAppClient
      // mailBridge: trpcMailBridgeClient
    }
  };
});
