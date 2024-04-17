import 'server-only';
import type { TrpcPlatformRouter } from '@u22n/platform/trpc';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import SuperJSON from 'superjson';
import { cookies, headers as nextHeaders } from 'next/headers';

export const serverApi = createTRPCClient<TrpcPlatformRouter>({
  links: [
    httpBatchLink({
      transformer: SuperJSON,
      url: getBaseUrl() + '/trpc',
      headers: async () => {
        let headers = new Headers(nextHeaders());
        return headers;
      },
      fetch: (input, init) => fetch(input, { ...init, credentials: 'include' })
    })
  ]
});

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_PLATFORM_URL)
    return process.env.NEXT_PUBLIC_PLATFORM_URL;
  throw new Error('PLATFORM_URL is not set');
}

export async function isAuthenticated() {
  if (!cookies().has('unsession')) return false;
  try {
    const data = await fetch(`${getBaseUrl()}/auth/status`).then((r) =>
      r.json()
    );
    const authenticated = data.authStatus === 'authenticated';
    return authenticated;
  } catch (e) {
    console.error(e);
    return false;
  }
}
