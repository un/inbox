export default defineNuxtRouteMiddleware(async (to) => {
  if (process.client) {
    const redirectCookie = useCookie('un-redirect').value;
    if (redirectCookie) {
      useCookie('un-redirect', { maxAge: 100 }).value = null;
      return navigateTo(redirectCookie);
    }
    const status = 'unauthenticated';
    const toGuest = to.meta.guest;
    const authedRedirect =
      useRuntimeConfig()?.public?.authJs?.authenticatedRedirectTo ||
      '/redirect';
    const guestRedirect =
      useRuntimeConfig()?.public?.authJs?.guestRedirectTo || '/';

    if (to.path.startsWith('/join/invite/')) {
      return;
    }

    if (status === 'authenticated') {
      if (!toGuest) {
        return;
      }
      return navigateTo(authedRedirect);
    }

    if (status === 'unauthenticated' || status === 'loading') {
      const verifyAuthStatus = await $fetch('/api/auth/status', {
        method: 'GET'
      });
      // status = verifyAuthStatus.authStatus || 'unauthenticated';
      if (status === 'unauthenticated') {
        if (toGuest) {
          return;
        }
        return navigateTo(guestRedirect);
      }
    }
  }
});
