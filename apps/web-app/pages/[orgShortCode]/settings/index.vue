<script setup lang="ts">
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg
</script>
<template>
  <div class="flex h-full w-full flex-col gap-2">
    <SettingsSidebar
      v-if="isMobile"
      class="h-full max-h-full w-full" />

    <div
      v-if="!isMobile"
      class="flex h-full w-full flex-col items-center justify-center">
      <span class="text-base-11">Select a category from the left</span>
    </div>
  </div>
</template>
