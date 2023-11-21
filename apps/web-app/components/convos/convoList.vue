<script setup lang="ts">
  import { useVirtualList, useInfiniteScroll } from '@vueuse/core';
  import { useConvoStore } from '@/stores/convoStore';
  const { $trpc } = useNuxtApp();

  // const convoStore = useConvoStore();
  // if (process.client && convoStore.convos.length === 0) {
  //   await convoStore.getInitialConvos();
  // }
  // console.log(convoStore.convos.length);

  const convosPending = ref(true);
  const convos = ref<UserConvosDataType>([]);
  const convoCursor = {
    lastUpdatedAt: null as Date | null,
    lastPublicId: null as string | null
  };
  const getInitialConvos = async () => {
    convos.value = [];
    if (convos.value.length !== 0) return;
    const { data: userConvos } = await $trpc.convos.getUserConvos.useLazyQuery(
      {}
    );
    if (!userConvos.value) {
      convosPending.value = false;
      return;
    }
    convos.value.push(...userConvos.value.data);
    convoCursor.lastUpdatedAt = userConvos.value.cursor.lastUpdatedAt;
    convoCursor.lastPublicId = userConvos.value.cursor.lastPublicId;
    convosPending.value = false;
    return;
  };
  const getNextConvos = async () => {
    if (
      convoCursor.lastUpdatedAt !== null &&
      convoCursor.lastPublicId !== null
    ) {
      const { data: userConvos } =
        await $trpc.convos.getUserConvos.useLazyQuery({
          cursorLastUpdatedAt: convoCursor.lastUpdatedAt,
          cursorLastPublicId: convoCursor.lastPublicId
        });
      if (!userConvos.value) return;
      convos.value.push(...userConvos.value.data);
      convoCursor.lastUpdatedAt = userConvos.value.cursor.lastUpdatedAt;
      convoCursor.lastPublicId = userConvos.value.cursor.lastPublicId;
    }
  };

  const { list, containerProps, wrapperProps } = useVirtualList(convos.value, {
    itemHeight: 127 + 16,
    overscan: 3
  });
  useInfiniteScroll(
    containerProps.ref,
    () => {
      getNextConvos();
    },
    { distance: 300 }
  );
  onMounted(async () => {
    if (process.client) {
      await getInitialConvos();
    }
  });
</script>
<template>
  <div
    class="h-full max-h-full max-w-full w-full overflow-y-scroll"
    v-bind="containerProps">
    <div
      v-if="!convosPending"
      class="mb-[48px] flex flex-col items-start gap-4"
      v-bind="wrapperProps">
      <div
        v-if="convosPending"
        class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
        <UnUiIcon
          name="i-svg-spinners:3-dots-fade"
          size="24" />
        <span>Loading conversations</span>
      </div>
      <div
        v-if="!convosPending && convos.length === 0"
        class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
        <UnUiIcon
          name="i-ph-chat-circle"
          size="24" />
        <span>No conversations found</span>
      </div>
      <div
        v-if="!convosPending && convos.length !== 0"
        class="max-w-full">
        <div
          v-for="convo of list"
          :id="convo.data.publicId"
          :key="convo.index"
          class="max-w-full"
          @click="navigateTo(`/h/convo/${convo.data.publicId}`)">
          <convos-convo-list-item :convo="convo.data" />
        </div>
      </div>
    </div>
  </div>
</template>
