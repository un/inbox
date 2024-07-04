<script setup lang="ts">
  import { navigateTo, useRoute, ref } from '#imports';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  import { useHead } from 'unhead';

  useHead({
    title: 'UnInbox'
  });

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg

  const orgShortCode = useRoute().params.orgShortCode as string;

  const view = ref<'convo' | 'hidden'>('convo');
  function toggleView() {
    view.value = view.value === 'convo' ? 'hidden' : 'convo';
  }
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
          @click="navigateTo(`/${orgShortCode}/convo/new`)" />
      </div>
    </div>
    <div
      v-if="isMobile"
      class="h-full w-full">
      <div class="flex h-full max-h-full flex-col-reverse gap-2 md:flex-col">
        <div class="flex grow flex-col gap-0 overflow-hidden">
          <convos-convo-list v-if="view === 'convo'" />
          <convos-hidden-convo-list v-if="view === 'hidden'" />
        </div>
        <span
          v-if="view === 'hidden'"
          class="text-base-11 w-full text-center text-xs">
          SHOWING HIDDEN CONVERSATIONS
        </span>
        <div class="flex flex-row gap-2">
          <UnUiButton
            class="flex-grow justify-center"
            label="New"
            icon="i-ph-plus"
            variant="outline"
            :to="`/${orgShortCode}/convo/new`" />
          <div>
            <UnUiButton
              class="flex-grow justify-center"
              square
              :icon="view === 'convo' ? 'i-ph-eye' : 'i-ph-eye-slash'"
              variant="outline"
              @click="toggleView()" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
