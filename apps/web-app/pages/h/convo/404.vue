<script setup lang="ts">
  definePageMeta({
    layout: 'convos'
  });
</script>
<template>
  <div
    class="flex flex-col gap-2 h-full max-h-full overflow-y-scroll w-full items-center align-middle justify-center">
    <div class="flex flex-row gap-2 font-display text-xl">
      Oops, we cant find that conversation
    </div>
    <div class="flex flex-row gap-2 text-lg">
      Either it dosn't exist, or you dont have access to it
    </div>
  </div>
</template>
