import {
  navigateTo,
  defineNuxtPlugin,
  useRuntimeConfig,
  useRoute,
  useToast
} from '#imports';
import { loggerLink, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client';
import superjson from 'superjson';
import type { TrpcPlatformRouter } from '@u22n/platform/trpc';

export const errorHandler: TRPCLink<TrpcPlatformRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          if (
            err.data?.code === 'UNAUTHORIZED' &&
            err.message ===
              'You are not a member of this organization, redirecting...'
          ) {
            navigateTo('/redirect');
            return;
          }
          if (
            err.data?.code === 'UNAUTHORIZED' &&
            err.message === 'You are not logged in, redirecting...'
          ) {
            navigateTo('/');
            return;
          }

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
  const route = useRoute();
  const trpcPlatformClient = createTRPCNuxtClient<TrpcPlatformRouter>({
    transformer: superjson,
    links: [
      errorHandler,
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === 'development' ||
          (opts.direction === 'down' && opts.result instanceof Error)
      }),
      httpBatchLink({
        url: `${config.public.platformUrl}/trpc`,
        maxURLLength: 2083,
        headers() {
          return {
            'org-shortcode': route.params.orgShortcode || ''
          };
        },
        fetch: (input, init) =>
          fetch(input, { credentials: 'include', ...init })
      })
    ]
  });

  return {
    provide: {
      trpc: trpcPlatformClient
    }
  };
});
