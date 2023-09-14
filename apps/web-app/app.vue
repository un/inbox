<script setup lang="ts">
  const route = useRoute().path;
  const computedLayout = computed(() =>
    route.startsWith('/h') ? 'home' : 'default'
  );
</script>

<template>
  <NuxtLayout
    class="h-screen overflow-hidden max-h-screen"
    :name="computedLayout">
    <NuxtPage />
  </NuxtLayout>
</template>
<style></style>
