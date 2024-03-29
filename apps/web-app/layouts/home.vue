<script setup lang="ts">
  // put in the handlers for the realtime client
  import { useRoute } from '#imports';
  import { useRealtime } from '~/composables/realtime';
  import { useConvoEntryStore } from '~/stores/convoEntryStore';
  import { useConvoStore } from '~/stores/convoStore';
  const orgSlug = useRoute().params.orgSlug;
  const realtime = await useRealtime();
  await realtime.connect({ orgSlug: orgSlug as string });

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
    class="overflow-none flex h-full max-h-full w-full flex-row items-center">
    <layout-navbar class="z-40" />
    <div
      class="bg-base-1 dark:bg-base-1 -ml-4 h-full max-h-full w-full overflow-hidden">
      <slot />
    </div>
  </div>
</template>
