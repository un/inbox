<script setup lang="ts">
  import { definePageMeta, navigateTo } from '#imports';
  definePageMeta({ guest: true });
</script>

<template>
  <div class="flex h-full w-full flex-col items-center justify-between p-4">
    <div
      class="flex w-full max-w-72 grow flex-col items-center justify-center gap-8">
      <span class="font-display text-5xl">UnInbox</span>
      <span class="text-center text-xl font-medium">
        EU Only hosting will release after the 15th of april
      </span>
      <span class="text-xl font-medium">Please check back later</span>
      <UnUiButton
        size="lg"
        @click="navigateTo('/join')">
        <span>Go Back to Sign Up</span>
      </UnUiButton>
    </div>
  </div>
</template>
