export default defineNuxtRouteMiddleware(async (to) => {
  if (process.client) {
    const redirectCookie = useCookie('unredirect').value;
    if (redirectCookie) {
      useCookie('unredirect', { maxAge: 100 }).value = null;
      return navigateTo(redirectCookie);
    }
    const status = useState<'unauthenticated' | 'authenticated'>(
      'auth',
      () => 'unauthenticated'
    );

    const toGuest = to.meta.guest;
    const authedRedirect = '/redirect';

    const guestRedirect = '/';

    if (to.path.startsWith('/join/invite/')) {
      return;
    }

    if (status.value === 'authenticated') {
      if (!toGuest) {
        return;
      }
      return navigateTo(authedRedirect);
    }

    if (status.value === 'unauthenticated') {
      const verifyAuthStatus = await fetch(
        `${useRuntimeConfig().public.platformUrl}/auth/status`,
        {
          method: 'GET',
          credentials: 'include'
        }
      ).then((res) => res.json());

      status.value = verifyAuthStatus.authStatus || 'unauthenticated';
      if (status.value === 'unauthenticated') {
        if (toGuest) {
          return;
        }
        return navigateTo(guestRedirect);
      }
      if (!toGuest) {
        return;
      }
      return navigateTo(authedRedirect);
    }
  }
});
