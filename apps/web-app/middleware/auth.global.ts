export default defineNuxtRouteMiddleware(async (to) => {
  if (process.client) {
    const redirectCookie = useCookie('un-redirect').value;
    if (redirectCookie) {
      useCookie('un-redirect', { maxAge: 100 }).value = null;
      return navigateTo(redirectCookie);
    }
    const { status, session } = useAuth();
    const toGuest = to.meta.guest;
    const authedRedirect =
      useRuntimeConfig()?.public?.authJs?.authenticatedRedirectTo ||
      '/redirect';
    const guestRedirect =
      useRuntimeConfig()?.public?.authJs?.guestRedirectTo || '/';

    if (to.path.startsWith('/join/invite/')) {
      return;
    }

    if (useAuth().status.value === 'authenticated') {
      if (!toGuest) {
        return;
      }
      return navigateTo(authedRedirect);
    }

    if (
      useAuth().status.value === 'unauthenticated' ||
      useAuth().status.value === 'loading'
    ) {
      const verifyAuthStatus = await $fetch('/api/auth/status', {
        method: 'GET'
      });
      useAuth().status.value = verifyAuthStatus.authStatus || 'unauthenticated';
      if (useAuth().status.value === 'unauthenticated') {
        if (toGuest) {
          return;
        }
        return navigateTo(guestRedirect);
      }
    }
  }
});
