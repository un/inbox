'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { loggerLink, httpBatchLink } from '@trpc/client';
import {
  createTRPCReact,
  type inferReactQueryProcedureOptions
} from '@trpc/react-query';
import { type PropsWithChildren, useState } from 'react';
import SuperJSON from 'superjson';
import type { TrpcCommandRouter } from '../server/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

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

export const platform = createTRPCReact<TrpcCommandRouter>();

export function TRPCReactProvider({ children }: PropsWithChildren) {
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
          url: `/api/trpc`,
          transformer: SuperJSON,
          fetch: (input, init) =>
            fetch(input, { ...init, credentials: 'include' })
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

export type ReactQueryOptions =
  inferReactQueryProcedureOptions<TrpcCommandRouter>;
export type RouterInputs = inferRouterInputs<TrpcCommandRouter>;
export type RouterOutputs = inferRouterOutputs<TrpcCommandRouter>;
