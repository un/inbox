<script setup lang="ts">
  // put in the handlers for the realtime client
  import { useRoute } from '#imports';
  import { useRealtime } from '~/composables/realtime';
  import { useConvoEntryStore } from '~/stores/convoEntryStore';
  import { useConvoStore } from '~/stores/convoStore';
  const orgShortcode = useRoute().params.orgShortcode;

  const convoStore = useConvoStore();
  const convoEntryStore = useConvoEntryStore();
  const realtime = useRealtime();

  realtime.connect({ orgShortcode: orgShortcode as string });

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
    <layout-navbar class="z-40" />
    <div
      class="bg-base-1 dark:bg-base-1 mt-[72px] h-full max-h-full w-full overflow-hidden lg:mt-0">
      <slot />
    </div>
  </div>
</template>
