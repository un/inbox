import { PiniaSharedState } from 'pinia-shared-state';

export default defineNuxtPlugin((nuxtApp) => {
  const { $pinia } = useNuxtApp();
  $pinia.use(
    PiniaSharedState({
      enable: false
    })
  );
});
