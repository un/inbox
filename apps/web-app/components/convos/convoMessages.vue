<script setup lang="ts">
  import { useInfiniteScroll } from '@vueuse/core';
  import { ref, useNuxtApp, watch } from '#imports';
  import { type ConvoEntryMetadata } from '@u22n/database/schema';
  import { useConvoEntryStore } from '~/stores/convoEntryStore';
  import type { TypeId } from '@u22n/utils';

  const { $trpc } = useNuxtApp();

  type ConvoEntriesDataType = Awaited<
    ReturnType<typeof $trpc.convos.entries.getConvoEntries.query>
  >['entries'];

  const el = ref<HTMLElement | null>(null);
  const entriesArray = ref<ConvoEntriesDataType>([]);

  type Props = {
    convoPublicId: TypeId<'convos'>;
  };

  const props = defineProps<Props>();

  const replyToMessagePublicId = defineModel<string>('replyToMessagePublicId');
  const replyToMessageMetadata = defineModel<ConvoEntryMetadata>(
    'replyToMessageMetadata'
  );

  const convoEntryStore = useConvoEntryStore();

  const convoEntries = await convoEntryStore.getConvoEntries({
    convoPublicId: props.convoPublicId
  });
  entriesArray.value = convoEntries?.entries ?? [];
  setReplyToMessagePublicId(entriesArray.value[0]?.publicId ?? '');
  watch(
    entriesArray,
    () => {
      setReplyToMessagePublicId(entriesArray.value[0]?.publicId ?? '');
    },
    { deep: true }
  );

  useInfiniteScroll(
    //@ts-expect-error - correct type not exported by vueUse
    el,
    () => {
      // load more
    },
    { distance: 300 }
  );

  function setReplyToMessagePublicId(publicId: string) {
    replyToMessagePublicId.value = publicId;
    const messageMetadata = entriesArray.value.find(
      (entry) => entry.publicId === publicId
    );
    replyToMessageMetadata.value = messageMetadata?.metadata ?? {};
  }
</script>
<template>
  <!-- <UnUiButton
    label="Refresh"
    icon="i-ph-arrow-clockwise"
    :loading="convoEntriesStatus === 'pending'"
    @click="convoEntriesRefresh()" /> -->
  <div
    class="flex h-full max-h-full w-full max-w-full flex-col-reverse overflow-y-scroll px-4">
    <div class="mb-6 mt-6 flex w-full flex-col-reverse items-start gap-12">
      <div
        v-for="entry of entriesArray"
        :key="entry.publicId"
        class="w-full max-w-full">
        <convos-convo-message-item
          :entry="entry"
          :is-reply-to="entry.publicId === replyToMessagePublicId"
          @set-as-reply-to="setReplyToMessagePublicId(entry.publicId)" />
      </div>
    </div>
  </div>
</template>
