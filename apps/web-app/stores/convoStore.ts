import { ref, computed } from 'vue';
import { defineStore, acceptHMRUpdate, useNuxtApp } from '#imports';
import type { TypeId } from '@u22n/utils/typeid';
import { useRoute } from '#vue-router';

export const useConvoStore = defineStore(
  'convos',
  () => {
    const { $trpc } = useNuxtApp();
    const orgShortCode = (useRoute().params.orgShortCode ?? '') as string;

    const convosListCursor = ref<{
      lastUpdatedAt: Date;
      lastPublicId: string;
    } | null>(null);
    const orgMemberHasMoreConvos = ref(true);
    const pauseConvoLoading = ref(false);

    type OrgMemberConvosDataType = Awaited<
      ReturnType<typeof $trpc.convos.getOrgMemberConvos.query>
    >['data'];
    const orgMemberConvos = ref<OrgMemberConvosDataType>([]);

    type UserConvoQueryParams =
      | {
          lastUpdatedAt: Date;
          lastPublicId: string;
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
        await $trpc.convos.getOrgMemberConvos.useQuery({
          cursor: convoQueryParams.value,
          orgShortCode
        });

      if (!convosListData.value) {
        convoQueryPending.value = false;
        return;
      }
      if (!convosListData.value.data) {
        orgMemberHasMoreConvos.value = false;
        convoQueryPending.value = false;
        return;
      }
      if (
        !convosListData.value.cursor ||
        convosListData.value.data.length === 0
      ) {
        orgMemberHasMoreConvos.value = false;
        convoQueryPending.value = false;
      }
      orgMemberConvos.value.push(...convosListData.value.data);
      convosListCursor.value = convosListData.value.cursor;
      convoQueryPending.value = false;
    }

    async function fetchAndAddSingleConvo({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }) {
      const { data: newConvo } =
        await $trpc.convos.getOrgMemberSpecificConvo.useQuery({
          convoPublicId,
          orgShortCode
        });
      if (!newConvo.value || !('publicId' in newConvo.value)) return;
      const convoLastUpdatedAt = new Date(newConvo.value.lastUpdatedAt);

      // check if convo already exist in the list
      const convoIndexInList = orgMemberConvos.value.findIndex(
        (convo) => convo.publicId === convoPublicId
      );

      //not in list
      if (convoIndexInList === -1) {
        const insertIndex = orgMemberConvos.value.findIndex(
          (convo) => new Date(convo.lastUpdatedAt) < convoLastUpdatedAt
        );
        if (insertIndex === -1) {
          orgMemberConvos.value.unshift(newConvo.value);
        } else {
          orgMemberConvos.value.splice(insertIndex, 0, newConvo.value);
        }
        return;
      }
      //in list
      if (convoIndexInList !== -1) {
        const existingConvoIndex = orgMemberConvos.value.findIndex(
          (convo) => convo.publicId === convoPublicId
        );
        const insertIndex = orgMemberConvos.value.findIndex(
          (convo) => new Date(convo.lastUpdatedAt) < convoLastUpdatedAt
        );
        orgMemberConvos.value.splice(existingConvoIndex, 1);
        orgMemberConvos.value.splice(insertIndex - 1, 0, newConvo.value);
      }

      // //! send push notification
    }

    async function hideConvoFromList({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }) {
      const convoIndex = orgMemberConvos.value.findIndex(
        (convo) => convo.publicId === convoPublicId
      );

      if (convoIndex === -1) return;
      orgMemberConvos.value.splice(convoIndex, 1);
    }

    async function unhideConvoFromList({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }) {
      await fetchAndAddSingleConvo({ convoPublicId });
    }

    function removeConvo({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }) {
      const index = orgMemberConvos.value.findIndex(
        (convo) => convo.publicId === convoPublicId
      );
      if (index > -1) {
        orgMemberConvos.value.splice(index, 1);
      }
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
      convoQueryPending,
      hideConvoFromList,
      unhideConvoFromList,
      removeConvo
    };
  },
  {
    share: { enable: false },
    persist: false
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConvoStore, import.meta.hot));
}
