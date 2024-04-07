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
    class="flex h-full max-h-full w-full flex-row justify-between overflow-hidden lg:grid lg:grid-cols-3">
    <ConvosSidebar
      v-if="!isMobile"
      class="border-base-6 bg-base-1 fixed z-[100] h-full max-h-full border-r p-4 lg:relative" />
    <div
      class="col-span-3 flex h-full max-h-full w-full flex-col items-center justify-center gap-2 overflow-hidden lg:col-span-2">
      <NuxtPage class="h-full max-h-full w-full" />
    </div>
  </div>
</template>
