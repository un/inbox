import 'server-only';
import type { TrpcPlatformRouter } from '@u22n/platform/trpc';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import SuperJSON from 'superjson';
import { cookies, headers, headers as nextHeaders } from 'next/headers';

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

// Skip the cookie validation on client with shallow=true
// it is checked on server anyways and may cause performance issues if checked on client on every request
export async function isAuthenticated(shallow = false) {
  if (!cookies().has('unsession')) return false;
  if (shallow) return true;
  try {
    const data = await fetch(`${getBaseUrl()}/auth/status`, {
      headers: headers()
    }).then((r) => r.json());
    const authenticated = data.authStatus === 'authenticated';
    return authenticated;
  } catch (e) {
    console.error(e);
    return false;
  }
}
