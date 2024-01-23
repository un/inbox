<script setup lang="ts">
  const { $trpc, $i18n } = useNuxtApp();

  const { data: userOrgSlug, execute } =
    await $trpc.auth.getUserDefaultOrgSlug.useLazyQuery({}, { server: false });
  watch(userOrgSlug, () => {
    if (!userOrgSlug.value) {
      return navigateTo(`/`);
    }
    const orgSlug = userOrgSlug.value?.slug;
    navigateTo(`/${orgSlug}`);
  });
</script>
<template>
  <div class="h-full w-full flex items-center justify-center">
    <span class="text-3xl font-display">Redirecting...</span>
  </div>
</template>
