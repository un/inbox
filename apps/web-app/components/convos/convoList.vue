<script setup lang="ts">
  import { useInfiniteScroll } from '@vueuse/core';
  import {
    computed,
    navigateTo,
    ref,
    useNuxtApp,
    watch,
    useRoute,
    onMounted
  } from '#imports';

  const { $trpc } = useNuxtApp();

  const orgSlug = useRoute().params.orgSlug as string;
  const infiniteContainer = ref<HTMLElement | null>(null);

  const convoCursor = ref<{
    cursorLastUpdatedAt: Date | null;
    cursorLastPublicId: string | null;
  }>({
    cursorLastUpdatedAt: null,
    cursorLastPublicId: null
  });
  const userHasMoreConvos = ref(true);
  const pauseLoading = ref(false);
  const convos = ref<{}[]>([]);

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
  <div class="h-full max-h-full w-full max-w-full overflow-hidden">
    <div
      v-if="userConvoQueryPending"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-8">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading conversations</span>
    </div>
    <div
      v-if="!userConvoQueryPending"
      class="mb-[48px] flex max-h-full flex-col items-start gap-4 overflow-hidden">
      <!-- <UnUiButton
        label="Refresh"
        icon="i-ph-arrow-clockwise"
        :loading="userConvosStatus === 'pending'"
        @click="refreshUserConvos()" /> -->
      <div
        v-if="!userHasConvos"
        class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-8">
        <UnUiIcon
          name="i-ph-chat-circle"
          size="24" />
        <span>No conversations found</span>
      </div>
      <div
        v-if="userHasConvos"
        ref="infiniteContainer"
        class="h-full max-h-full w-full max-w-full overflow-auto">
        <DynamicScroller
          :items="convos"
          key-field="publicId"
          :min-item-size="48">
          <template #default="{ item, index, active }">
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :size-dependencies="[item.data]"
              :data-index="index"
              class="pb-4"
              @click="navigateTo(`/${orgSlug}/convo/${item.publicId}`)">
              <convos-convo-list-item :convo="item" />
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
        <div
          v-if="userHasMoreConvos && pauseLoading"
          class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-8">
          <UnUiIcon
            name="i-svg-spinners:3-dots-fade"
            size="24" />
          <span>Loading more conversations</span>
        </div>
      </div>
    </div>
  </div>
</template>
