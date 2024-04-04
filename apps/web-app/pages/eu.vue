<script setup lang="ts">
  import { definePageMeta } from '#imports';
  definePageMeta({ guest: true });
</script>

<template>
  <div
    class="flex h-screen w-screen flex-col items-center justify-between p-4 pb-14">
    <div
      class="flex w-full max-w-72 grow flex-col items-center justify-center gap-8">
      <span class="font-display text-5xl">UnInbox</span>
      <div>
        <NuxtUiBadge
          label="Beta"
          size="md"
          color="amber" />
      </div>
      <span class="text-xl font-medium"
        >EU Only hosting will release after the 15th of april</span
      >
      <span class="text-xl font-medium">Please check back later</span>
    </div>
  </div>
</template>
