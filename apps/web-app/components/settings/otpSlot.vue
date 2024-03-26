<script setup lang="ts">
  import type { SlotProps } from 'vue-input-otp';

  defineProps<SlotProps>();
</script>

<template>
  <div
    class="border-border outline-base-9/20 group-focus-within:border-base-9/20 group-hover:border-base-9/20 relative flex h-14 w-10 items-center justify-center border-y border-r text-[2rem] outline outline-0 transition-all duration-100 first:rounded-l-md first:border-l last:rounded-r-md"
    :class="isActive ? 'outline-base-9 outline-2' : ''">
    <div v-if="char !== null">
      {{ char }}
    </div>

    <!-- Emulate a Fake Caret -->
    <div
      v-if="char === null && isActive"
      class="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
      <div class="bg-base-9 h-8 w-px" />
    </div>
  </div>
</template>
