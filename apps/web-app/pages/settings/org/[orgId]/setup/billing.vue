<script setup lang="ts">
  definePageMeta({
    layout: 'settings',
    middleware: 'ee'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Billing</span>
          <span class="text-sm"
            >Manage your organization's subscription and features</span
          >
        </div>
      </div>
      <div class="flex flex-row gap-4 items-center">
        <button
          class="flex flex-row gap-2 p-2 border-1 rounded items-center justify-center border-base-7 bg-base-3 max-w-80">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">Add new</p>
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-8 w-full overflow-y-scroll">
      <div class="flex flex-col gap-8 w-full">LALALA</div>
    </div>
  </div>
</template>
