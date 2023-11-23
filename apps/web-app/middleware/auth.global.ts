export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) {
    const event = useRequestEvent();
    if (!to.meta.skipAuth) {
      if (!event.context.user) {
        console.log(event.context);
        //TODO: Add "redirectTo" for users when they've logged in
        return navigateTo('/');
      }
      return;
    }
    if (to.meta.skipAuth) {
      if (event.context.user) {
        if (to.path !== '/h') return navigateTo('/h');
      }
      return;
    }
  }

  if (process.client) {
    return;
  }
});
