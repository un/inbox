<script setup lang="ts">
  import { useInfiniteScroll } from '@vueuse/core';
  import { navigateTo, ref, useRoute, onMounted, storeToRefs } from '#imports';
  import { useHiddenConvoStore } from '~/stores/convoHiddenStore';

  const orgShortcode = useRoute().params.orgShortcode as string;
  const infiniteContainer = ref<HTMLElement | null>(null);

  const hiddenConvoStore = useHiddenConvoStore();

  const {
    pauseHiddenConvoLoading,
    orgMemberHiddenConvos,
    orgMemberHasHiddenConvos,
    orgMemberHasMoreHiddenConvos,
    hiddenConvoQueryPending,
    hiddenConvoQueryParams,
    hiddenConvosListCursor
  } = storeToRefs(hiddenConvoStore);

  useInfiniteScroll(
    infiniteContainer,
    async () => {
      if (pauseHiddenConvoLoading.value) return;
      if (!orgMemberHasMoreHiddenConvos.value) return;
      if (hiddenConvoQueryPending.value) return;
      pauseHiddenConvoLoading.value = true;
      hiddenConvoQueryParams.value = {
        cursorLastUpdatedAt: hiddenConvosListCursor.value.cursorLastUpdatedAt,
        cursorLastPublicId: hiddenConvosListCursor.value.cursorLastPublicId
      };
      await hiddenConvoStore.getHiddenConvoList();
      pauseHiddenConvoLoading.value = false;
    },
    {
      distance: 100,
      canLoadMore: () => orgMemberHasMoreHiddenConvos.value
    }
  );

  onMounted(async () => {
    if (orgMemberHiddenConvos.value.length === 0) {
      await hiddenConvoStore.getHiddenConvoList();
    }
  });
</script>
<template>
  <div class="h-full max-h-full w-full max-w-full overflow-hidden">
    <div
      v-if="hiddenConvoQueryPending"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading conversations</span>
    </div>

    <div
      v-if="!hiddenConvoQueryPending"
      class="mb-[48px] flex max-h-full flex-col items-start gap-4 overflow-hidden">
      <div
        v-if="!orgMemberHasHiddenConvos"
        class="flex w-full flex-col items-center justify-center gap-4 p-4">
        <img
          alt="Inbox Zero"
          src="public/inbox-zero.svg"
          class="w-full" />
        <div
          class="bg-base-3 flex w-full flex-row items-center justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
          <UnUiIcon
            name="i-ph-hands-praying"
            size="24" />
          <span>Enjoy your UnInbox Zero</span>
        </div>
      </div>
      <div
        v-if="orgMemberHasHiddenConvos"
        ref="infiniteContainer"
        class="h-full max-h-full w-full max-w-full overflow-auto">
        <DynamicScroller
          :items="orgMemberHiddenConvos"
          key-field="publicId"
          :min-item-size="24">
          <template #default="{ item, index, active }">
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :size-dependencies="[item.data]"
              :data-index="index"
              class="pb-4"
              @click="navigateTo(`/${orgShortcode}/convo/${item.publicId}`)">
              <convos-convo-list-item :convo="item" />
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
        <div
          v-if="orgMemberHasMoreHiddenConvos && pauseHiddenConvoLoading"
          class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
          <UnUiIcon
            name="i-svg-spinners:3-dots-fade"
            size="24" />
          <span>Loading more conversations</span>
        </div>
      </div>
    </div>
  </div>
</template>
