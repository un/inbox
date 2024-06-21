'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { loggerLink, httpBatchLink } from '@trpc/client';
import {
  createTRPCReact,
  type inferReactQueryProcedureOptions
} from '@trpc/react-query';
import { type PropsWithChildren, useState } from 'react';
import SuperJSON from 'superjson';
import type { TrpcPlatformRouter } from '@u22n/platform/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { env } from 'next-runtime-env';

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

export const api = createTRPCReact<TrpcPlatformRouter>();

export function TRPCReactProvider({ children }: PropsWithChildren) {
  const queryClient = getQueryClient();
  const PLATFORM_URL = env('NEXT_PUBLIC_PLATFORM_URL');

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error)
        }),
        httpBatchLink({
          url: `${PLATFORM_URL}/trpc`,
          transformer: SuperJSON,
          fetch: (input, init) =>
            fetch(input, { ...init, credentials: 'include' })
        })
      ]
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider
        client={trpcClient}
        queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  );
}

export async function isAuthenticated() {
  const PLATFORM_URL = env('NEXT_PUBLIC_PLATFORM_URL');
  try {
    const data = (await fetch(`${PLATFORM_URL}/auth/status`, {
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
