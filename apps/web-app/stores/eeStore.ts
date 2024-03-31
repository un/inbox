import { ref } from 'vue';
import { defineStore, acceptHMRUpdate, useNuxtApp } from '#imports';
import { useEE } from '~/composables/EE';

export const useEEStore = defineStore(
  'ee',
  () => {
    const { $trpc } = useNuxtApp();

    const isPro = ref<boolean | null>(null);
    const isProPending = ref<boolean>(true);

    async function getIsPro() {
      if (isPro.value !== null) {
        isProPending.value = false;
        return;
      }
      if (!useEE().config.modules.billing) {
        isPro.value = true;
        isProPending.value = false;
        return;
      }
      const { data } = await $trpc.org.setup.billing.isPro.useQuery({});
      isPro.value = data.value?.isPro || false;
      isProPending.value = false;
    }

    getIsPro(); // Call the function when the code is first loaded

    return {
      isPro: isPro,
      isProPending: isProPending
    };
  },
  {
    share: { enable: true },
    persist: false
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEEStore, import.meta.hot));
}
