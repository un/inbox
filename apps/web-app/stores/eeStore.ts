import { ref } from 'vue';
import { defineStore, acceptHMRUpdate, useNuxtApp } from '#imports';
import { useEE } from '~/composables/EE';

export const useEEStore = defineStore(
  'ee',
  () => {
    const { $trpc } = useNuxtApp();

    const isPro = ref<boolean | null>(null);
    const isProPending = ref<boolean>(true);
    const canAddDomain = ref<boolean | null>(null);
    const canAddDomainPending = ref<boolean>(true);

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
    async function getCanAddDomain() {
      if (!useEE().config.modules.billing) {
        canAddDomain.value = true;
        canAddDomainPending.value = false;
        return;
      }
      const data = await $trpc.org.setup.billing.canAddDomain.query({});

      canAddDomain.value = data.canAddDomain || false;
      canAddDomainPending.value = false;
    }

    getIsPro(); // Call the function when the code is first loaded

    return {
      isPro: isPro,
      isProPending: isProPending,
      canAddDomain: canAddDomain,
      canAddDomainPending: canAddDomainPending,
      getCanAddDomain
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
