<script setup lang="ts">
  definePageMeta({
    layout: 'home'
  });
</script>
<template>
  <div class="h-full max-h-full w-full max-w-full overflow-hidden">
    <div
      class="grid h-full max-h-full w-full grid-cols-4 justify-between overflow-hidden">
      <SettingsSidebar class="h-full max-h-full" />
      <div
        class="col-span-3 flex h-full max-h-full w-full flex-col items-center justify-center gap-2 overflow-hidden p-4">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>
