import { ref, computed } from 'vue';
import { defineStore, acceptHMRUpdate, useNuxtApp } from '#imports';
import type { TypeId } from '@u22n/utils';
import { useRoute } from '#vue-router';

export const useHiddenConvoStore = defineStore(
  'hiddenConvos',
  () => {
    const { $trpc } = useNuxtApp();
    const orgShortCode = (useRoute().params.orgShortCode ?? '') as string;

    const hiddenConvosListCursor = ref<{
      lastUpdatedAt: Date;
      lastPublicId: string;
    } | null>(null);

    const orgMemberHasMoreHiddenConvos = ref(true);
    const pauseHiddenConvoLoading = ref(false);

    type OrgMemberConvosDataType = Awaited<
      ReturnType<typeof $trpc.convos.getOrgMemberConvos.query>
    >['data'];
    const orgMemberHiddenConvos = ref<OrgMemberConvosDataType>([]);

    type UserConvoQueryParams =
      | {
          lastUpdatedAt: Date;
          lastPublicId: string;
        }
      | {};
    const hiddenConvoQueryParams = ref<UserConvoQueryParams>({});
    const hiddenConvoQueryPending = ref(true);
    const orgMemberHasHiddenConvos = computed(() => {
      return orgMemberHiddenConvos.value.length > 0;
    });

    async function getHiddenConvoList() {
      hiddenConvoQueryPending.value = true;
      const { data: convosListData } =
        await $trpc.convos.getOrgMemberConvos.useQuery({
          cursor: hiddenConvoQueryParams.value,
          includeHidden: true,
          orgShortCode
        });
      hiddenConvoQueryPending.value = false;

      if (!convosListData.value) {
        return;
      }
      if (
        !convosListData.value.data ||
        !convosListData.value.cursor ||
        convosListData.value.data.length === 0
      ) {
        orgMemberHasMoreHiddenConvos.value = false;
        hiddenConvoQueryPending.value = false;
        return;
      }

      orgMemberHiddenConvos.value.push(...convosListData.value.data);
      hiddenConvosListCursor.value = convosListData.value.cursor;

      hiddenConvoQueryPending.value = false;
    }

    async function fetchAndAddSingleHiddenConvo({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }) {
      if (hiddenConvoQueryPending.value === true) {
        await getHiddenConvoList();
      }
      const { data: newConvo } =
        await $trpc.convos.getOrgMemberSpecificConvo.useQuery({
          convoPublicId,
          orgShortCode
        });
      if (!newConvo.value || !('publicId' in newConvo.value)) return;
      const convoLastUpdatedAt = new Date(newConvo.value.lastUpdatedAt);

      // check if convo already exist in the list
      const convoIndexInList = orgMemberHiddenConvos.value.findIndex(
        (convo) => convo.publicId === convoPublicId
      );

      //not in list
      if (convoIndexInList === -1) {
        const insertIndex = orgMemberHiddenConvos.value.findIndex(
          (convo) => new Date(convo.lastUpdatedAt) < convoLastUpdatedAt
        );
        if (insertIndex === -1) {
          orgMemberHiddenConvos.value.unshift(newConvo.value);
        } else {
          orgMemberHiddenConvos.value.splice(insertIndex, 0, newConvo.value);
        }
      }
      //in list
      if (convoIndexInList !== -1) {
        const existingConvoIndex = orgMemberHiddenConvos.value.findIndex(
          (convo) => convo.publicId === convoPublicId
        );
        const insertIndex = orgMemberHiddenConvos.value.findIndex(
          (convo) => new Date(convo.lastUpdatedAt) < convoLastUpdatedAt
        );
        orgMemberHiddenConvos.value.splice(existingConvoIndex, 1);
        orgMemberHiddenConvos.value.splice(insertIndex, 0, newConvo.value);
      }
      // //! send push notification
    }

    async function unhideHiddenConvoFromList({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }) {
      const convoIndex = orgMemberHiddenConvos.value.findIndex(
        (convo) => convo.publicId === convoPublicId
      );

      if (convoIndex === -1) return;
      orgMemberHiddenConvos.value.splice(convoIndex, 1);
    }

    async function hideHiddenConvoFromList({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }) {
      await fetchAndAddSingleHiddenConvo({ convoPublicId });
    }

    function removeConvo({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }) {
      const index = orgMemberHiddenConvos.value.findIndex(
        (convo) => convo.publicId === convoPublicId
      );
      if (index > -1) {
        orgMemberHiddenConvos.value.splice(index, 1);
      }
    }

    return {
      getHiddenConvoList,
      fetchAndAddSingleHiddenConvo,
      orgMemberHiddenConvos,
      orgMemberHasHiddenConvos,
      orgMemberHasMoreHiddenConvos,
      hiddenConvosListCursor,
      pauseHiddenConvoLoading,
      hiddenConvoQueryParams,
      hiddenConvoQueryPending,
      hideHiddenConvoFromList,
      unhideHiddenConvoFromList,
      removeConvo
    };
  },
  {
    share: { enable: false },
    persist: false
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useHiddenConvoStore, import.meta.hot));
}
