<script setup lang="ts">
  import { useVirtualList, useInfiniteScroll, useTimeAgo } from '@vueuse/core';
  const { $trpc } = useNuxtApp();
  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type ConvoEntriesDataType = PromiseType<
    ReturnType<typeof $trpc.convos.entries.getConvoEntries.query>
  >['entries'];
  const el = ref<HTMLElement | null>(null);
  const entriesArray = ref<ConvoEntriesDataType>([]);

  type Props = {
    convoPublicId: string;
  };

  const props = defineProps<Props>();

  const { data: convoEntries } =
    await $trpc.convos.entries.getConvoEntries.useLazyQuery(
      {
        convoPublicId: props.convoPublicId
      },
      { server: false, queryKey: `convoEntries-${props.convoPublicId}` }
    );

  watch(convoEntries, () => {
    if (convoEntries.value?.entries) {
      entriesArray.value.push(...convoEntries.value.entries);
    }
  });

  useInfiniteScroll(
    el,
    () => {
      // load more
    },
    { distance: 300 }
  );
</script>
<template>
  <div
    class="h-full max-h-full max-w-full w-full flex flex-col-reverse overflow-y-scroll">
    <div
      class="mb-[24px] mt-[24px] w-full flex flex-col-reverse items-start gap-4">
      <div
        v-for="entry of entriesArray"
        :key="entry.publicId"
        class="max-w-full w-full">
        <convos-convo-message-item :entry="entry" />
      </div>
    </div>
  </div>
</template>
