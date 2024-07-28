'use client';

import {
  createTRPCReact,
  type inferReactQueryProcedureOptions
} from '@trpc/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { loggerLink, httpBatchLink } from '@trpc/client';
import { type PropsWithChildren, useState } from 'react';
import type { TrpcCommandRouter } from '../server/trpc';
import SuperJSON from 'superjson';

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

export const api = createTRPCReact<TrpcCommandRouter>();

export function TRPCReactProvider({ children }: PropsWithChildren) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
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
      <api.Provider
        client={trpcClient}
        queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  );
}

export type ReactQueryOptions =
  inferReactQueryProcedureOptions<TrpcCommandRouter>;
export type RouterInputs = inferRouterInputs<TrpcCommandRouter>;
export type RouterOutputs = inferRouterOutputs<TrpcCommandRouter>;
