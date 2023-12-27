<script setup lang="ts">
  const { $trpc, $i18n } = useNuxtApp();

  const { data: userOrgSlug, execute } =
    await $trpc.auth.getUserDefaultOrgSlug.useLazyQuery({}, { server: false });
  watch(userOrgSlug, () => {
    if (!userOrgSlug.value) return;
    const orgSlug = userOrgSlug.value?.slug;
    navigateTo(`/${orgSlug}`);
  });
</script>
<template><div>Redirecting...</div></template>
