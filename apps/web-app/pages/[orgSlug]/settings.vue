<script setup lang="ts">
  import { definePageMeta } from '#imports';

  definePageMeta({
    layout: 'home'
  });
</script>
<template>
  <div class="h-full max-h-full w-full max-w-full overflow-hidden">
    <div
      class="flex h-full max-h-full w-full flex-row justify-between overflow-hidden lg:grid lg:grid-cols-4">
      <SettingsSidebar class="z-[100] h-full max-h-full" />
      <div
        class="flex h-full max-h-full w-full flex-col items-center justify-center gap-2 overflow-hidden p-4 pl-20 lg:col-span-3 lg:pl-16">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>
