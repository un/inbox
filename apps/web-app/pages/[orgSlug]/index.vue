<script setup lang="ts">
  const orgSlug = useRoute().params.orgSlug as string;

  reloadNuxtApp({
    path: `/${orgSlug}/convo`,
    force: true,
    ttl: 5000
  });

  // navigateTo(`/${orgSlug}/convo`);
</script>
<template><div></div></template>
