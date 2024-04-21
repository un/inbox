<script setup lang="ts">
  import {
    definePageMeta,
    navigateTo,
    onMounted,
    onUnmounted,
    ref,
    watch,
    useNuxtApp,
    useRoute
  } from '#imports';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg
  const orgShortcode = useRoute().params.orgShortcode as string;

  const enabled = ref(true);
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          v-if="isMobile"
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="navigateTo(`/${orgShortcode}/settings`)" />

        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Permissions</span>
          <span class="text-sm">
            Manage your organization's permissions and settings
          </span>
        </div>
      </div>
    </div>

    <div class="flex w-full flex-col gap-4 overflow-y-auto">
      <div class="flex flex-row items-center gap-4">
        <UnUiToggle v-model="enabled" />
        <span>Enable deleting conversations</span>
      </div>
      <div class="flex flex-row items-center gap-4">
        <UnUiToggle />
        <span>Allow users to create spaces</span>
      </div>
      <div class="flex flex-row items-center gap-4">
        <UnUiToggle />
        <span>Allow users to create email identities</span>
      </div>
    </div>
  </div>
</template>
