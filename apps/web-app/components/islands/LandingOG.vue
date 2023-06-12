<script setup lang="ts">
const props = defineProps({
  description: String,
  sub: String,
  cta: String
});

// inherited attrs can mess up the satori parser
defineOptions({
  inheritAttrs: false
});
</script>

<template>
  <div class="w-full h-full flex flex-col text-white bg-zinc-900 items-center justify-center">
    <h1 class="m-0 text-9xl" :style="{ fontFamily: 'CalSans' }">UnInbox</h1>
    <p class="text-5xl" :style="{ fontFamily: 'Inter' }">{{ description }}</p>
    <p class="text-4xl italic" :style="{ fontFamily: 'Inter' }">{{ sub }}</p>
  </div>
</template>
<style scoped></style>
