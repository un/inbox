export const useConvoStore = definePiniaStore(
  'convos',
  () => {
    const { $trpc } = useNuxtApp();

    const conversations = ref<ConversationObject[]>([]);

    const updateConversations = async () => {
      const userStashes = await $trpc.stashes.getUserStashes.query();
      conversations.value = userStashes.system;
    };
    if (conversations.value.length === 0) {
      updateConversations();
    }
    return {
      conversations,
      updateConversations
    };
  },
  {
    share: { enable: true }
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConvoStore, import.meta.hot));
}
