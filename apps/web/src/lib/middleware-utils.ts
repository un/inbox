import { cookies, headers as nextHeaders } from 'next/headers';
import 'server-only';

function getPlatformUrl() {
  if (process.env.NEXT_PUBLIC_PLATFORM_URL)
    return process.env.NEXT_PUBLIC_PLATFORM_URL;
  throw new Error('NEXT_PUBLIC_PLATFORM_URL is not set');
}

function clientHeaders() {
  const allHeaders = nextHeaders();
  const clientHeaders = new Headers();
  const notAllowedHeaders = ['host', 'origin', 'referer'];
  allHeaders.forEach((value, key) => {
    if (notAllowedHeaders.includes(key)) return;
    clientHeaders.append(key, value);
  });
  return clientHeaders;
}

export async function getAuthRedirection() {
  if (!cookies().has('un-session')) return { defaultOrgShortcode: null };
  return fetch(`${getPlatformUrl()}/auth/redirection`, {
    headers: clientHeaders()
  }).then((r) => (r.ok ? r.json() : { defaultOrgShortcode: null })) as Promise<{
    defaultOrgShortcode: string | null;
  }>;
}

// Skip the cookie validation on client with shallow=true
// it is checked on server anyways and may cause performance issues if checked on client on every request
export async function isAuthenticated(shallow = false) {
  if (!cookies().has('un-session')) return false;
  if (shallow) return true;
  try {
    const data = (await fetch(`${getPlatformUrl()}/auth/status`, {
      headers: clientHeaders()
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
