<script setup lang="ts">
  const { $trpc, $i18n } = useNuxtApp();

  const { data: userOrgSlug, execute } =
    await $trpc.auth.getUserDefaultOrgSlug.useLazyQuery(
      {},
      { server: false, immediate: false }
    );
  await execute();
  const orgSlug = userOrgSlug.value?.slug;
  navigateTo(`/${orgSlug}`);
</script>
<template><div></div></template>
