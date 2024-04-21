<script setup lang="ts">
  import { useInfiniteScroll } from '@vueuse/core';
  import { navigateTo, ref, useRoute, onMounted, storeToRefs } from '#imports';
  import { useConvoStore } from '~/stores/convoStore';

  const { orgShortcode, spaceShortcode } = useRoute().params;
  const infiniteContainer = ref<HTMLElement | null>(null);

  const convoStore = useConvoStore();

  const {
    pauseConvoLoading,
    orgMemberConvos,
    orgMemberHasConvos,
    orgMemberHasMoreConvos,
    convoQueryPending,
    convoQueryParams,
    convosListCursor
  } = storeToRefs(convoStore);

  useInfiniteScroll(
    //@ts-expect-error - correct type not exported by vueUse
    infiniteContainer,
    async () => {
      if (pauseConvoLoading.value) return;
      if (!orgMemberHasMoreConvos.value) return;
      if (convoQueryPending.value) return;
      pauseConvoLoading.value = true;
      convoQueryParams.value = {
        cursorLastUpdatedAt: convosListCursor.value.cursorLastUpdatedAt,
        cursorLastPublicId: convosListCursor.value.cursorLastPublicId
      };
      await convoStore.getConvoList();
      pauseConvoLoading.value = false;
    },
    {
      distance: 100,
      canLoadMore: () => orgMemberHasMoreConvos.value
    }
  );

  onMounted(() => {
    if (orgMemberConvos.value.length === 0) convoStore.getConvoList();
  });
</script>
<template>
  <div class="h-full max-h-full w-full max-w-full overflow-hidden">
    <div
      v-if="convoQueryPending"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading conversations</span>
    </div>

    <div
      v-if="!convoQueryPending"
      class="mb-[48px] flex max-h-full flex-col items-start gap-4 overflow-hidden">
      <!-- <UnUiButton
        label="Refresh"
        icon="i-ph-arrow-clockwise"
        :loading="userConvosStatus === 'pending'"
        @click="refreshUserConvos()" /> -->
      <div
        v-if="!orgMemberHasConvos"
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
        v-if="orgMemberHasConvos"
        ref="infiniteContainer"
        class="h-full max-h-full w-full max-w-full overflow-auto">
        <DynamicScroller
          :items="orgMemberConvos"
          key-field="publicId"
          :min-item-size="24">
          <template #default="{ item, index, active }">
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :size-dependencies="[item.data]"
              :data-index="index"
              class="pb-4"
              @click="
                navigateTo(
                  `/${orgShortcode}/${spaceShortcode}/convo/${item.publicId}`
                )
              ">
              <convos-convo-list-item :convo="item" />
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
        <div
          v-if="orgMemberHasMoreConvos && pauseConvoLoading"
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
