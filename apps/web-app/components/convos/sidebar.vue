<script setup lang="ts">
  import { useRoute } from '#imports';

  const orgSlug = useRoute().params.orgSlug as string;
</script>
<template>
  <div
    class="border-r-1 border-base-6 flex h-full max-h-full flex-col gap-2 overflow-y-auto pr-4">
    <div class="flex grow flex-col gap-0 overflow-hidden">
      <convos-convo-list />

      <div class="from-base-1 mt-[-48px] h-[48px] bg-gradient-to-t" />
    </div>
    <div class="flex flex-row gap-2">
      <UnUiButton
        class="flex-grow justify-center"
        :ui="{
          rounded: 'rounded-bl-xl'
        }"
        label="New"
        icon="i-ph-plus"
        variant="outline"
        :to="`/${orgSlug}/convo/new`" />
    </div>
  </div>
</template>
