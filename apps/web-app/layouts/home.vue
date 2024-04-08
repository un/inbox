<script setup lang="ts">
  // put in the handlers for the realtime client
  import { useRoute } from '#imports';
  import { useRealtime } from '~/composables/realtime';
  import { useConvoEntryStore } from '~/stores/convoEntryStore';
  import { useConvoStore } from '~/stores/convoStore';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg

  const orgShortcode = useRoute().params.orgShortcode;
  const realtime = useRealtime();
  await realtime
    .connect({ orgShortcode: orgShortcode as string })
    .catch(() => {});

  const convoStore = useConvoStore();
  const convoEntryStore = useConvoEntryStore();

  realtime.on('convo:new', async (convo) => {
    await convoStore.fetchAndAddSingleConvo({ convoPublicId: convo.publicId });
    return;
  });
  realtime.on('convo:entry:new', async (convoEntry) => {
    await convoEntryStore.addConvoSingleEntry({
      convoPublicId: convoEntry.convoPublicId,
      convoEntryPublicId: convoEntry.convoEntryPublicId
    });
    await convoStore.refreshConvoInList({
      convoPublicId: convoEntry.convoPublicId
    });
    return;
  });
</script>
<template>
  <div
    class="overflow-none flex h-full max-h-full w-full flex-col items-center lg:flex-row">
    <layout-navbar
      v-if="!isMobile"
      class="z-40" />
    <div
      class="bg-base-1 dark:bg-base-1 h-full max-h-full w-full overflow-hidden lg:mt-0">
      <slot />
    </div>
    <layout-mobile-nav
      v-if="isMobile"
      class="bottom-0 z-40" />
  </div>
</template>
