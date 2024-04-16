<script setup lang="ts">
  import { useRoute, ref } from '#imports';

  const orgShortcode = useRoute().params.orgShortcode as string;

  const view = ref<'convo' | 'hidden'>('convo');
  function toggleView() {
    view.value = view.value === 'convo' ? 'hidden' : 'convo';
  }
</script>
<template>
  <div
    class="border-r-1 border-base-6 z-[30] flex h-full max-h-full flex-col gap-2 overflow-y-auto overflow-x-hidden pr-4 lg:w-full">
    <div class="flex h-full max-h-full flex-col-reverse gap-2 md:flex-col">
      <span
        v-if="view === 'hidden'"
        class="text-base-11 w-full text-center text-xs">
        SHOWING HIDDEN CONVERSATIONS
      </span>
      <div class="flex grow flex-col gap-0 overflow-hidden">
        <convos-convo-list v-if="view === 'convo'" />
        <convos-hidden-convo-list v-if="view === 'hidden'" />
      </div>
      <div class="flex flex-row gap-2">
        <UnUiButton
          class="flex-grow justify-center"
          label="New"
          icon="i-ph-plus"
          variant="outline"
          :to="`/${orgShortcode}/convo/new`" />
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
</template>
