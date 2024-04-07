<script setup lang="ts">
  import { navigateTo, useRoute } from '#imports';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg

  const orgShortcode = useRoute().params.orgShortcode as string;
</script>
<template>
  <div
    class="flex h-full max-h-full w-full flex-col items-center justify-center overflow-hidden p-4">
    <div
      v-if="!isMobile"
      class="flex flex-col gap-2">
      <span class="">Select a conversation from the left, or</span>
      <div>
        <UnUiButton
          class="w-full"
          label="Start new conversation"
          icon="i-ph-plus"
          @click="navigateTo(`/${orgShortcode}/convo/new`)" />
      </div>
    </div>
    <div
      v-if="isMobile"
      class="h-full w-full">
      <div class="flex h-full max-h-full flex-col-reverse gap-2 lg:flex-col">
        <div class="flex grow flex-col gap-0 overflow-hidden">
          <convos-convo-list />
        </div>

        <UnUiButton
          label="New"
          block
          icon="i-ph-plus"
          variant="outline"
          :to="`/${orgShortcode}/convo/new`" />
      </div>
    </div>
  </div>
</template>
