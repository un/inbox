function getPlatformUrl() {
  if (process.env.PLATFORM_URL) return process.env.PLATFORM_URL;
  throw new Error('PLATFORM_URL is not set');
}

function clientHeaders(req: Request) {
  const allHeaders = req.headers;
  const clientHeaders = new Headers();
  const notAllowedHeaders = ['host', 'origin', 'referer'];
  allHeaders.forEach((value, key) => {
    if (notAllowedHeaders.includes(key)) return;
    clientHeaders.append(key, value);
  });
  return clientHeaders;
}

function parseCookies(cookies: string | null) {
  const parsed = cookies
    ? Object.fromEntries(
        cookies.split(';').map((c) => c.split('=').map((_) => _.trim())) as [
          string,
          string
        ][]
      )
    : {};
  return parsed as Record<string, string | undefined>;
}

export async function getAuthRedirection(req: Request) {
  const cookies = parseCookies(req.headers.get('Cookie'));
  if (!cookies['un-session']) return { defaultOrgShortcode: null };
  return fetch(`${getPlatformUrl()}/auth/redirection`, {
    headers: clientHeaders(req)
  }).then((r) => (r.ok ? r.json() : { defaultOrgShortcode: null })) as Promise<{
    defaultOrgShortcode: string | null;
  }>;
}

// Skip the cookie validation on client with shallow=true
// it is checked on server anyways and may cause performance issues if checked on client on every request
export async function isAuthenticated(req: Request, shallow = false) {
  const cookies = parseCookies(req.headers.get('Cookie'));
  if (!cookies['un-session']) return false;
  if (shallow) return true;
  try {
    const data = (await fetch(`${getPlatformUrl()}/auth/status`, {
      headers: clientHeaders(req)
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
