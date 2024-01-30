<script setup lang="ts">
  import { useVirtualList, useInfiniteScroll } from '@vueuse/core';
  import { useConvoStore } from '@/stores/convoStore';
  const { $trpc } = useNuxtApp();

  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type UserConvosDataType = PromiseType<
    ReturnType<typeof $trpc.convos.getUserConvos.query>
  >['data'];
  // const convoStore = useConvoStore();
  // if (process.client && convoStore.convos.length === 0) {
  //   await convoStore.getInitialConvos();
  // }
  // console.log(convoStore.convos.length);

  const orgSlug = useRoute().params.orgSlug as string;

  const convoCursor = ref({
    lastUpdatedAt: null as Date | null,
    lastPublicId: null as string | null
  });
  const userHasMoreConvos = ref(true);
  const convos = ref<{}[]>([]);
  // const convos = ref<UserConvosDataType[]>([]);

  const userConvoQueryParams = computed(() => {
    if (!convoCursor.value.lastUpdatedAt || !convoCursor.value.lastPublicId)
      return {};
    return {
      cursorLastUpdatedAt: convoCursor.value.lastUpdatedAt,
      cursorLastPublicId: convoCursor.value.lastPublicId
    };
  });
  const userConvoQueryPending = computed(() => {
    return userConvosStatus.value === 'idle';
  });
  const userHasConvos = computed(() => {
    return convos.value.length > 0;
  });

  const {
    data: userConvosData,
    status: userConvosStatus,
    execute: userConvosFetch
  } = await $trpc.convos.getUserConvos.useLazyQuery(
    userConvoQueryParams.value,
    {
      server: false
    }
  );

  watch(
    userConvosData,
    (newVal) => {
      if (!newVal) return;
      if (!newVal.data || !newVal.cursor || newVal.data.length === 0) {
        userHasMoreConvos.value = false;
        return;
      }
      convos.value.push(...newVal.data);
      convoCursor.value.lastUpdatedAt = newVal.cursor.lastUpdatedAt;
      convoCursor.value.lastPublicId = newVal.cursor.lastPublicId;
    },
    {
      immediate: true,
      deep: true
    }
  );

  // useInfiniteScroll(
  //   containerProps.ref,
  //   () => {
  //     getNextConvos();
  //   },
  //   { distance: 300, canLoadMore: () => userHasMoreConvos.value }
  // );
</script>
<template>
  <div class="h-full max-h-full max-w-full w-full overflow-y-scroll">
    <div
      v-if="userConvoQueryPending"
      class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading conversations</span>
    </div>
    <div
      v-if="!userConvoQueryPending"
      class="mb-[48px] flex flex-col items-start gap-4">
      <div
        v-if="!userHasConvos"
        class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
        <UnUiIcon
          name="i-ph-chat-circle"
          size="24" />
        <span>No conversations found</span>
      </div>
      <div
        v-if="userHasConvos"
        class="max-w-full">
        <DynamicScroller
          :items="convos"
          key-field="publicId"
          :min-item-size="48">
          <template #default="{ item, index, active }">
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :size-dependacies="[item.data]"
              :data-index="index"
              class="pb-4"
              @click="navigateTo(`/${orgSlug}/convo/${item.publicId}`)">
              <convos-convo-list-item :convo="item" />
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
        <div>convos exist</div>
        <div>{{ convos.length }}</div>
        <div>{{ convoCursor }}</div>
        <div>{{ convos[0] }}</div>
      </div>
    </div>
  </div>
</template>
