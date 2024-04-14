<script setup lang="ts">
  import { useRoute, reloadNuxtApp } from '#imports';

  const orgShortcode = useRoute().params.orgShortcode as string;
  const urlParams = useRoute().query;

  const has2FAError = urlParams['error'] === '2fa';

  // this page is only used as an interim redirect page due to this nuxt issue https://github.com/nuxt/nuxt/issues/25214
  // we navigate here from the Redirect page, reload nuxt, then redirect to the convos view - we should not directly navigate from the REDIRECT page to convos page!!!

  if (has2FAError) {
    reloadNuxtApp({
      path: `/${orgShortcode}/settings/user/security?2fa=error`,
      force: true,
      ttl: 5000
    });
  }
  if (!has2FAError) {
    reloadNuxtApp({
      path: `/${orgShortcode}/convo`,
      force: true,
      ttl: 5000
    });
  }

  // navigateTo(`/${orgShortcode}/convo`);
</script>
<template><div></div></template>
