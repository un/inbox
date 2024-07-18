import 'server-only';
import { cookies, headers as nextHeaders } from 'next/headers';

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_PLATFORM_URL)
    return process.env.NEXT_PUBLIC_PLATFORM_URL;
  throw new Error('NEXT_PUBLIC_PLATFORM_URL is not set');
}

export async function getAuthRedirection() {
  if (!cookies().has('unsession')) return { defaultOrgShortcode: null };
  return fetch(`${getBaseUrl()}/auth/redirection`, {
    headers: nextHeaders()
  }).then((r) => (r.ok ? r.json() : { defaultOrgShortcode: null })) as Promise<{
    defaultOrgShortcode: string | null;
  }>;
}

// Skip the cookie validation on client with shallow=true
// it is checked on server anyways and may cause performance issues if checked on client on every request
export async function isAuthenticated(shallow = false) {
  if (!cookies().has('unsession')) return false;
  if (shallow) return true;
  try {
    const data = (await fetch(`${getBaseUrl()}/auth/status`, {
      headers: nextHeaders()
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
