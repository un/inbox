<script setup lang="ts">
  import { useInfiniteScroll } from '@vueuse/core';
  import { ref, useNuxtApp, watch } from '#imports';

  const { $trpc } = useNuxtApp();
  type ConvoEntriesDataType = Awaited<
    ReturnType<typeof $trpc.convos.entries.getConvoEntries.query>
  >['entries'];
  const el = ref<HTMLElement | null>(null);
  const entriesArray = ref<ConvoEntriesDataType>([]);

  type Props = {
    convoPublicId: string;
  };

  const props = defineProps<Props>();

  const replyToMessagePublicId = defineModel('replyToMessagePublicId', {
    type: String,
    default: ''
  });

  const {
    data: convoEntries,
    refresh: convoEntriesRefresh,
    status: convoEntriesStatus
  } = await $trpc.convos.entries.getConvoEntries.useLazyQuery(
    {
      convoPublicId: props.convoPublicId
    },
    { server: false, queryKey: `convoEntries-${props.convoPublicId}` }
  );

  watch(convoEntries, () => {
    if (convoEntries.value && convoEntries.value.entries) {
      entriesArray.value.push(...convoEntries.value.entries);
      replyToMessagePublicId.value =
        convoEntries.value.entries[0]?.publicId ?? '';
    }
  });

  useInfiniteScroll(
    el,
    () => {
      // load more
    },
    { distance: 300 }
  );

  function setReplyToMessagePublicId(publicId: string) {
    replyToMessagePublicId.value = publicId;
  }
</script>
<template>
  <!-- <UnUiButton
    label="Refresh"
    icon="i-ph-arrow-clockwise"
    :loading="convoEntriesStatus === 'pending'"
    @click="convoEntriesRefresh()" /> -->
  <div
    class="flex h-full max-h-full w-full max-w-full flex-col-reverse overflow-y-auto">
    <div
      class="mb-[24px] mt-[24px] flex w-full flex-col-reverse items-start gap-4">
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
