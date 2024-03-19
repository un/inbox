<script setup lang="ts">
  const orgSlug = useRoute().params.orgSlug as string;
</script>
<template>
  <div
    class="col-span-2 flex h-full w-full flex-col items-center justify-center gap-2 pl-4">
    <div class="col-span-2 pl-4">Select a conversation from the left, or</div>
    <button
      class="border-1 border-base-7 bg-base-3 flex w-full max-w-80 flex-row items-center justify-center gap-4 rounded p-2"
      @click="navigateTo(`/${orgSlug}/convo/new`)">
      <UnUiIcon
        name="i-ph-plus"
        size="20" />
      <p class="text-sm">Start new</p>
    </button>
  </div>
</template>
