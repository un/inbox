export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server && !to.meta.skipAuth) {
    const event = useRequestEvent();
    if (!event.context.user.valid) {
      //TODO: Add "redirectTo" for users when they've logged in
      return navigateTo('/');
    }
    return;
  }

  if (process.client) {
    return;
  }
});
