import { ref } from 'vue';
import { defineStore, acceptHMRUpdate, useNuxtApp } from '#imports';
import type { TypeId } from '@u22n/utils';

export const useConvoEntryStore = defineStore(
  'convoEntries',
  () => {
    const { $trpc } = useNuxtApp();

    type ConvoEntriesDataType = Awaited<
      ReturnType<typeof $trpc.convos.entries.getConvoEntries.query>
    >['entries'];

    type ConvoData = {
      publicId: TypeId<'convos'>;
      entries: ConvoEntriesDataType;
    };

    const convosEntries = ref<ConvoData[]>([]);

    async function getConvoEntries({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }): Promise<
      | {
          entries: ConvoEntriesDataType;
          lastMessagePublicId: TypeId<'convoEntries'> | undefined;
        }
      | undefined
    > {
      const entries = convosEntries.value.find(
        (convo) => convo.publicId === convoPublicId
      )?.entries;

      if (entries) {
        return {
          entries: entries,
          lastMessagePublicId: entries[0]?.publicId // Added null check
        };
      }

      let data;
      let newDataStatus = 'loading';
      while (newDataStatus === 'loading') {
        const { data: result, status: queryStatus } =
          await $trpc.convos.entries.getConvoEntries.useQuery({
            convoPublicId: convoPublicId
          });

        data = result;
        newDataStatus = queryStatus.value;
        if (newDataStatus !== 'success') {
          await new Promise((resolve) => setTimeout(resolve, 3000)); // wait for 1 second before next attempt
        }
      }

      if (data && data.value && data.value.entries) {
        convosEntries.value.push({
          publicId: convoPublicId,
          entries: data.value.entries
        });
        return {
          entries: data.value.entries,
          lastMessagePublicId: data.value.entries[0]?.publicId // Added null check
        };
      }
      return undefined;
    }

    async function addConvoSingleEntry({
      convoPublicId,
      convoEntryPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
      convoEntryPublicId: TypeId<'convoEntries'>;
    }): Promise<ConvoEntriesDataType[0] | undefined> {
      const existingConvoEntries = convosEntries.value.find(
        (convo) => convo.publicId === convoPublicId
      );
      if (!existingConvoEntries) {
        getConvoEntries({ convoPublicId });
        return;
      }

      const { data: result } =
        await $trpc.convos.entries.getConvoSingleEntry.useQuery({
          convoPublicId,
          convoEntryPublicId
        });

      if (result && result.value) {
        const convo = convosEntries.value.find(
          (convo) => convo.publicId === convoPublicId
        );
        if (convo) {
          convo.entries.unshift(result.value.entry);
        }
      }

      return;
    }

    function removeConvo({
      convoPublicId
    }: {
      convoPublicId: TypeId<'convos'>;
    }) {
      const index = convosEntries.value.findIndex(
        (convo) => convo.publicId === convoPublicId
      );
      if (index > -1) {
        convosEntries.value.splice(index, 1);
      }
    }

    return {
      convosEntries,
      getConvoEntries,
      addConvoSingleEntry,
      removeConvo
    };
  },
  {
    share: { enable: false },
    persist: false
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConvoEntryStore, import.meta.hot));
}
