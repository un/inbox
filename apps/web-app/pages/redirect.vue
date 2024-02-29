<script setup lang="ts">
  const { $trpc } = useNuxtApp();

  onMounted(async () => {
    const { slug } = await $trpc.user.defaults.getDefaultOrgSlug.query({});
    console.log(slug);
    if (!slug) {
      return navigateTo(`/join/org`);
    }
    setTimeout(() => {
      navigateTo(`/${slug}`);
    }, 500);
  });
</script>
<template>
  <div class="h-full w-full flex items-center justify-center">
    <span class="text-3xl font-display">Redirecting...</span>
  </div>
</template>
