<script setup lang="ts">
  const orgSlug = useRoute().params.orgSlug as string;
</script>
<template>
  <div
    class="h-full max-h-full flex flex-col gap-2 overflow-y-scroll border-r-1 border-base-6 pr-4">
    <div class="flex grow flex-col gap-0 overflow-hidden">
      <convos-convo-list />

      <div class="mt-[-48px] h-[48px] from-base-1 bg-gradient-to-t" />
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
      <!-- <UnUiButton
        class="flex-grow justify-center"
        label="Filter"
        icon="i-ph-list-checks"
        variant="outline"
        :to="`/${orgSlug}/convo/new`" /> -->
    </div>
  </div>
</template>
