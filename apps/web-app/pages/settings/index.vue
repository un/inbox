<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
</script>
<template>
  <div
    class="flex-col flex justify-center gap-2 items-center w-full col-span-2 pl-4 h-full">
    <div class="col-span-2 pl-4">Select a conversation from the left, or</div>
    <button
      class="flex flex-row gap-4 p-2 border-1 rounded w-full items-center justify-center border-base-7 bg-base-3 max-w-80">
      <icon
        name="ph-plus"
        size="20" />
      <p class="text-sm">Start new</p>
    </button>
  </div>
</template>
