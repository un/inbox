<script setup lang="ts">
  import { useRoute } from '#imports';

  const orgShortcode = useRoute().params.orgShortcode as string;
</script>
<template>
  <div
    class="border-r-1 border-base-6 z-[30] flex h-full max-h-full flex-col gap-2 overflow-y-auto overflow-x-hidden pr-4 lg:w-full">
    <div class="flex h-full max-h-full flex-col-reverse gap-2 md:flex-col">
      <div class="flex grow flex-col gap-0 overflow-hidden">
        <convos-convo-list />
      </div>
      <div class="flex flex-row gap-2">
        <UnUiButton
          class="flex-grow justify-center"
          label="New"
          icon="i-ph-plus"
          variant="outline"
          :to="`/${orgShortcode}/convo/new`" />
      </div>
    </div>
  </div>
</template>
