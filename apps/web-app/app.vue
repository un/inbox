<script setup lang="ts">
  const route = useRoute();
</script>

<template>
  <NuxtLayout class="h-screen max-h-screen overflow-hidden">
    <NuxtPage />
  </NuxtLayout>
  <NuxtUiNotifications>
    <template #title="{ title }">
      <span v-html="title" />
    </template>

    <template #description="{ description }">
      <span v-html="description" />
    </template>
  </NuxtUiNotifications>
</template>
<style></style>
