'use client';

import {
  createTRPCReact,
  type inferReactQueryProcedureOptions
} from '@trpc/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TrpcPlatformRouter } from '@u22n/platform/trpc';
import { loggerLink, httpBatchLink } from '@trpc/client';
import { type PropsWithChildren, useState } from 'react';
import { useRouter } from 'next/navigation';
import SuperJSON from 'superjson';
import { env } from '../env';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false
      }
    }
  });

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const platform = createTRPCReact<TrpcPlatformRouter>();

export function TRPCReactProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    platform.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error)
        }),
        httpBatchLink({
          url: `${env.NEXT_PUBLIC_PLATFORM_URL}/trpc`,
          transformer: SuperJSON,
          fetch: (input, init) =>
            fetch(input, { ...init, credentials: 'include' }).then((r) => {
              const redirect = r.headers.get('Location');
              if (redirect) router.replace(redirect);
              return r;
            })
        })
      ]
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <platform.Provider
        client={trpcClient}
        queryClient={queryClient}>
        {children}
      </platform.Provider>
    </QueryClientProvider>
  );
}

export async function isAuthenticated() {
  try {
    const data = (await fetch(`${env.NEXT_PUBLIC_PLATFORM_URL}/auth/status`, {
      credentials: 'include'
    }).then((r) => r.json())) as {
      authStatus: 'authenticated' | 'unauthenticated';
    };
    const authenticated = data.authStatus === 'authenticated';
    return authenticated;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export type ReactQueryOptions =
  inferReactQueryProcedureOptions<TrpcPlatformRouter>;
export type RouterInputs = inferRouterInputs<TrpcPlatformRouter>;
export type RouterOutputs = inferRouterOutputs<TrpcPlatformRouter>;
