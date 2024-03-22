import { defineNuxtPlugin, useNuxtApp } from '#imports';
import { PiniaSharedState } from 'pinia-shared-state';

export default defineNuxtPlugin(() => {
  const { $pinia } = useNuxtApp();
  $pinia.use(
    PiniaSharedState({
      enable: false
    })
  );
});
