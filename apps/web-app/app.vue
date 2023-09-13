<script setup lang="ts">
  const route = useRoute().path;

  const layout = route.startsWith('/h') ? 'home' : 'default';
</script>

<template>
  <NuxtLayout
    class="h-screen overflow-auto"
    :name="layout">
    <!-- <TopNav /> -->
    <NuxtPage />
    <!-- <UNotifications /> -->
  </NuxtLayout>
</template>
<style></style>
