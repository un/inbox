import { ref, computed } from 'vue';
import { defineStore, acceptHMRUpdate, useRoute, useNuxtApp } from '#imports';
import type { TypeId } from '@u22n/utils';

export const useConvoStore = defineStore(
  'convos',
  () => {
    const { $trpc } = useNuxtApp();
    const orgSlug = useRoute().params.orgSlug as string;

    const convosListCursor = ref<{
      cursorLastUpdatedAt: Date | null;
      cursorLastPublicId: string | null;
    }>({
      cursorLastUpdatedAt: null,
      cursorLastPublicId: null
    });
    const orgMemberHasMoreConvos = ref(true);
    const pauseConvoLoading = ref(false);
    const orgMemberConvos = ref<{}[]>([]);

    type UserConvoQueryParams =
      | {
          cursorLastUpdatedAt: Date;
          cursorLastPublicId: string;
        }
      | {};
    const convoQueryParams = ref<UserConvoQueryParams>({});
    const convoQueryPending = ref(true);
    const orgMemberHasConvos = computed(() => {
      return orgMemberConvos.value.length > 0;
    });

    async function getConvoList() {
      convoQueryPending.value = true;
      const { data: convosListData } =
        await $trpc.convos.getOrgMemberConvos.useQuery(convoQueryParams, {
          queryKey: `convos-${orgSlug}`
        });

      if (!convosListData.value) {
        convoQueryPending.value = false;
        return;
      }
      if (
        !convosListData.value.data ||
        !convosListData.value.cursor ||
        convosListData.value.data.length === 0
      ) {
        orgMemberHasMoreConvos.value = false;
        convoQueryPending.value = false;
        return;
      }
      orgMemberConvos.value.push(...convosListData.value.data);
      convosListCursor.value.cursorLastUpdatedAt =
        convosListData.value.cursor.lastUpdatedAt;
      convosListCursor.value.cursorLastPublicId =
        convosListData.value.cursor.lastPublicId;

      convoQueryPending.value = false;
    }

    async function fetchAndAddSingleConvo({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }) {
      const { data: newConvo } =
        await $trpc.convos.getOrgMemberSpecificConvo.useQuery(
          { convoPublicId },
          {
            queryKey: `convo-${convoPublicId}`
          }
        );
      if (!newConvo.value || !('publicId' in newConvo.value)) return;
      //! send push notification
      orgMemberConvos.value.unshift(newConvo.value);
    }

    return {
      getConvoList,
      fetchAndAddSingleConvo,
      orgMemberConvos,
      orgMemberHasConvos,
      orgMemberHasMoreConvos,
      convosListCursor,
      pauseConvoLoading,
      convoQueryParams,
      convoQueryPending
    };
  },
  {
    share: { enable: true },
    persist: false
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConvoStore, import.meta.hot));
}
