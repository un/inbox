export default defineNuxtRouteMiddleware(async (to) => {
  const eeConfig = useRuntimeConfig().public.ee;
  if (eeConfig.enabled) {
    return;
  }

  return navigateTo('/redirect');
});
