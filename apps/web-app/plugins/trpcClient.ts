import { loggerLink, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client';
import superjson from 'superjson';

import type { TrpcWebAppRouter } from '../server/trpc';
import type { TrpcMailBridgeRouter } from '@uninbox/types/trpc';

export const errorHandler: TRPCLink<TrpcWebAppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          const toast = useToast();
          toast.add({
            id: 'error',
            title: `Error: ${err.data?.code}`,
            color: 'red',
            description: err.message,
            icon: 'i-ph-warning-octagon',
            timeout: 20000
          });
          observer.error(err);
        },
        complete() {
          observer.complete();
        }
      });
      return unsubscribe;
    });
  };
};

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const orgSlug = useRoute().params.orgSlug as string;
  const trpcWebAppClient = createTRPCNuxtClient<TrpcWebAppRouter>({
    transformer: superjson,
    links: [
      errorHandler,
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
