<script setup lang="ts">
  import { useRoute, reloadNuxtApp } from '#imports';

  const orgShortcode = useRoute().params.orgShortcode as string;

  // this page is only used as an interim redirect page due to this nuxt issue https://github.com/nuxt/nuxt/issues/25214
  // we navigate here from the Redirect page, reload nuxt, then redirect to the convos view - we should not directly navigate from the REDIRECT page to convos page!!!

  reloadNuxtApp({
    path: `/${orgShortcode}/convo`,
    force: true,
    ttl: 5000
  });

  // navigateTo(`/${orgShortcode}/convo`);
</script>
<template><div></div></template>
