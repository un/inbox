<script setup lang="ts">
  import { definePageMeta } from '#imports';

  definePageMeta({
    layout: 'home'
  });
</script>
<template>
  <div class="h-full max-h-full w-full max-w-full overflow-hidden">
    <div
      class="flex h-full max-h-full w-full flex-row justify-between overflow-hidden">
      <SettingsSidebar class="z-[100] h-full max-h-full" />
      <div
        class="flex h-full max-h-full w-full flex-col items-center justify-center gap-2 overflow-hidden overflow-y-auto p-4 pl-20">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>
