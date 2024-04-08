<script setup lang="ts">
  import { definePageMeta } from '#imports';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg

  definePageMeta({
    layout: 'home'
  });
</script>
<template>
  <div
    class="grid h-full max-h-full w-full max-w-full grid-cols-3 overflow-hidden">
    <SettingsSidebar
      v-if="!isMobile"
      class="col-span-1 h-full max-h-full" />
    <div
      class="col-span-3 h-full max-h-full w-full items-center justify-center gap-2 overflow-hidden overflow-y-auto p-0 lg:col-span-2">
      <NuxtPage />
    </div>
  </div>
</template>
