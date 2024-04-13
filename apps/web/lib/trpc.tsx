'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { loggerLink, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import SuperJSON from 'superjson';

import type { TrpcPlatformRouter } from '@u22n/platform/trpc';

const createQueryClient = () => new QueryClient();

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

export function TRPCReactProvider(props: { children: React.ReactNode }) {
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
          transformer: SuperJSON,
          url: getBaseUrl() + '/trpc',
          headers: () => {
            const headers = new Headers();
            headers.set('x-trpc-source', 'nextjs-react');
            return headers;
          },
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
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  process.env.PUBLIC_PLATFORM_URL = 'http://localhost:3300';

  if (process.env.PUBLIC_PLATFORM_URL) return process.env.PUBLIC_PLATFORM_URL;
  throw new Error('PLATFORM_URL is not set');
}
