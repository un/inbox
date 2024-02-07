<script setup lang="ts">
  const orgSlug = useRoute().params.orgSlug as string;
</script>
<template>
  <div
    class="col-span-2 h-full w-full flex flex-col items-center justify-center gap-2 pl-4">
    <div class="col-span-2 pl-4">Select a conversation from the left, or</div>
    <button
      class="max-w-80 w-full flex flex-row items-center justify-center gap-4 border-1 border-base-7 rounded bg-base-3 p-2"
      @click="navigateTo(`/${orgSlug}/convo/new`)">
      <UnUiIcon
        name="i-ph-plus"
        size="20" />
      <p class="text-sm">Start new</p>
    </button>
  </div>
</template>
