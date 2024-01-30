<script setup lang="ts">
  import { useVirtualList, useInfiniteScroll } from '@vueuse/core';
  import { useConvoStore } from '@/stores/convoStore';
  const { $trpc } = useNuxtApp();

  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type UserConvosDataType = PromiseType<
    ReturnType<typeof $trpc.convos.getUserConvos.query>
  >['data'];

  const orgSlug = useRoute().params.orgSlug as string;
  const infiniteContainer = ref<HTMLElement | null>(null);

  const convoCursor = ref({
    cursorLastUpdatedAt: null as Date | null,
    cursorLastPublicId: null as string | null
  });
  const userHasMoreConvos = ref(true);
  const pauseLoading = ref(false);
  const convos = ref<{}[]>([]);
  // const convos = ref<UserConvosDataType[]>([]);

  type UserConvoQueryParams =
    | {
        cursorLastUpdatedAt: Date;
        cursorLastPublicId: string;
      }
    | {};
  const userConvoQueryParams = ref<UserConvoQueryParams>({});
  const userConvoQueryPending = computed(() => {
    return userConvosStatus.value === 'idle';
  });
  const userHasConvos = computed(() => {
    return convos.value.length > 0;
  });

  const {
    data: userConvosData,
    status: userConvosStatus,
    execute: getUserConvos
  } = await $trpc.convos.getUserConvos.useLazyQuery(userConvoQueryParams, {
    server: false,
    queryKey: `userConvos-${orgSlug}`,
    immediate: false,
    watch: [userConvoQueryParams]
  });

  watch(
    userConvosData,
    (newVal) => {
      if (!newVal) return;
      if (!newVal.data || !newVal.cursor || newVal.data.length === 0) {
        userHasMoreConvos.value = false;
        return;
      }
      convos.value.push(...newVal.data);
      convoCursor.value.cursorLastUpdatedAt = newVal.cursor.lastUpdatedAt;
      convoCursor.value.cursorLastPublicId = newVal.cursor.lastPublicId;
    },
    {
      immediate: true,
      deep: true
    }
  );

  useInfiniteScroll(
    infiniteContainer,
    async () => {
      if (pauseLoading.value) return;
      if (!userHasMoreConvos.value) return;
      if (userConvosStatus.value === 'pending') return;
      pauseLoading.value = true;
      userConvoQueryParams.value = {
        cursorLastUpdatedAt: convoCursor.value.cursorLastUpdatedAt,
        cursorLastPublicId: convoCursor.value.cursorLastPublicId
      };
      pauseLoading.value = false;
    },
    { distance: 100, canLoadMore: () => userHasMoreConvos.value }
  );

  onMounted(() => {
    if (convos.value.length === 0) getUserConvos();
  });
</script>
<template>
  <div class="h-full max-h-full max-w-full w-full overflow-hidden">
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
      class="mb-[48px] max-h-full flex flex-col items-start gap-4 overflow-hidden">
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
        ref="infiniteContainer"
        class="h-full max-h-full max-w-full w-full overflow-scroll">
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
        <div
          v-if="userHasMoreConvos && pauseLoading"
          class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
          <UnUiIcon
            name="i-svg-spinners:3-dots-fade"
            size="24" />
          <span>Loading more conversations</span>
        </div>
      </div>
    </div>
  </div>
</template>
