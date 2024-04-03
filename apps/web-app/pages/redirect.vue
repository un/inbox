<script setup lang="ts">
  import { navigateTo, useNuxtApp, onMounted } from '#imports';

  const { $trpc } = useNuxtApp();

  onMounted(async () => {
    const { defaultOrgShortcode, twoFactorEnabledCorrectly } =
      await $trpc.account.defaults.redirectionData.query({});

    if (!twoFactorEnabledCorrectly) {
      return navigateTo(`/join/2fa`);
    }

    if (!defaultOrgShortcode) {
      return navigateTo(`/join/org`);
    }
    // We need to redirect to the index page of [orgShortcode] due to this nuxt issue https://github.com/nuxt/nuxt/issues/25214
    // the index page will reload nuxt, then redirect to the convos view - we should not directly navigate to convos page!!!
    setTimeout(() => {
      navigateTo(`/${defaultOrgShortcode}`);
    }, 500);
  });
</script>
<template>
  <div class="flex h-full w-full items-center justify-center">
    <span class="font-display text-3xl">Redirecting...</span>
  </div>
</template>
