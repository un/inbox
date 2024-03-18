<script setup lang="ts">
  definePageMeta({
    layout: 'home'
  });
</script>
<template>
  <div class="h-full max-h-full w-full max-w-full overflow-hidden">
    <div
      class="grid h-full max-h-full w-full grid-cols-3 justify-between overflow-hidden">
      <ConvosSidebar
        class="border-base-6 bg-base-2 h-full max-h-full rounded-r-xl border-r-2 p-8 pl-12 shadow-md" />
      <div
        class="col-span-2 flex h-full max-h-full w-full flex-col items-center justify-center gap-2 overflow-hidden pl-4">
        <NuxtPage class="h-full max-h-full w-full" />
      </div>
    </div>
  </div>
</template>
