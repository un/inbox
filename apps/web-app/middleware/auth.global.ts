export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) {
    const event = useRequestEvent();
    if (!to.meta.skipAuth) {
      if (!event.context.user) {
        return navigateTo('/');
      }
      return;
    }
    if (to.meta.skipAuth) {
      if (event.context.user) {
        if (to.path !== '/login') {
          return navigateTo('/login');
        }
        return;
      }
    }
  }

  if (process.client) {
    return;
  }
});
