<script setup lang="ts">
  import { definePageMeta } from '#imports';

  definePageMeta({
    layout: 'home'
  });
</script>
<template>
  <div class="h-full max-h-full w-full max-w-full overflow-hidden">
    <div
      class="flex h-full max-h-full w-full flex-row justify-between overflow-hidden lg:grid lg:grid-cols-3">
      <ConvosSidebar
        class="border-base-6 bg-base-1 fixed z-[100] h-full max-h-full border-r p-4 lg:relative" />
      <div
        class="col-span-2 hidden h-full max-h-full w-full flex-col items-center justify-center gap-2 overflow-hidden lg:flex">
        <NuxtPage class="h-full max-h-full w-full" />
      </div>
    </div>
  </div>
</template>
