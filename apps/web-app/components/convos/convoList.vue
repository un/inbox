<script setup lang="ts">
  import { useVirtualList, useInfiniteScroll } from '@vueuse/core';
  import { useConvoStore } from '@/stores/convoStore';

  const convoStore = useConvoStore();
  if (process.client && convoStore.convos.length === 0) {
    await convoStore.getInitialConvos();
  }
  console.log(convoStore.convos.length);

  const { list, containerProps, wrapperProps } = useVirtualList(
    convoStore.convos,
    {
      itemHeight: 152,
      overscan: 3
    }
  );
  useInfiniteScroll(
    containerProps.ref,
    () => {
      // load more
      convoStore.getNextConvos();
    },
    { distance: 300 }
  );
</script>
<template>
  <div
    class="max-w-full w-full h-full max-h-full overflow-y-scroll"
    v-bind="containerProps">
    <div
      class="flex flex-col items-start gap-4 mb-[48px]"
      v-bind="wrapperProps">
      <div
        v-for="convo of list"
        :key="convo.index"
        :id="convo.data.publicId"
        @click="navigateTo(`/h/convo/${convo.data.publicId}`)"
        class="max-w-full">
        <convos-convo-list-item :convo="convo.data" />
      </div>
    </div>
  </div>
</template>
