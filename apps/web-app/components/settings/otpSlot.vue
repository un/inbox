<script setup lang="ts">
  import type { SlotProps } from 'vue-input-otp';

  defineProps<SlotProps>();
</script>

<template>
  <div
    class="border-border relative flex h-14 w-10 items-center justify-center border-y border-r text-[2rem] outline outline-0 outline-gray-500/20 transition-all duration-100 first:rounded-l-md first:border-l last:rounded-r-md group-focus-within:border-gray-500/20 group-hover:border-gray-500/20"
    :class="isActive ? 'outline-2 outline-gray-500' : ''">
    <div v-if="char !== null">
      {{ char }}
    </div>

    <!-- Emulate a Fake Caret -->
    <div
      v-if="char === null && isActive"
      class="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
      <div class="h-8 w-px bg-gray-500" />
    </div>
  </div>
</template>
