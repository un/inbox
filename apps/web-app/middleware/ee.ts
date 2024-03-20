import {
  defineNuxtRouteMiddleware,
  useRuntimeConfig,
  navigateTo
} from '#imports';

export default defineNuxtRouteMiddleware(async () => {
  const eeConfig = useRuntimeConfig().public.ee;
  if (eeConfig.enabled) {
    return;
  }

  return navigateTo('/redirect');
});
