<script setup lang="ts">
  const { $trpc } = useNuxtApp();

  onMounted(async () => {
    const { slug } = await $trpc.auth.getUserDefaultOrgSlug.query({});
    if (!slug) {
      return navigateTo(`/`);
    }
    navigateTo(`/${slug}`);
  });
</script>
<template>
  <div class="h-full w-full flex items-center justify-center">
    <span class="text-3xl font-display">Redirecting...</span>
  </div>
</template>
