<script setup lang="ts">
  const { $trpc } = useNuxtApp();

  onMounted(async () => {
    const { defaultOrgSlug } = await $trpc.user.defaults.redirectionData.query(
      {}
    );

    if (!defaultOrgSlug) {
      return navigateTo(`/join/org`);
    }
    setTimeout(() => {
      navigateTo(`/${defaultOrgSlug}`);
    }, 500);
  });
</script>
<template>
  <div class="flex h-full w-full items-center justify-center">
    <span class="font-display text-3xl">Redirecting...</span>
  </div>
</template>
