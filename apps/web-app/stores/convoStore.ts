export const useConvoStore = defineStore(
  'convos',
  () => {
    type PromiseType<T> = T extends Promise<infer U> ? U : never;
    type UserConvosDataType = PromiseType<
      ReturnType<typeof $trpc.convos.getUserConvos.query>
    >['data'];
    const { $trpc } = useNuxtApp();

    const convos = ref<UserConvosDataType>([]);
    const convoCursor = {
      lastUpdatedAt: null as Date | null,
      lastPublicId: null as string | null
    };
    const getInitialConvos = async () => {
      convos.value = [];
      if (convos.value.length !== 0) return;
      const userConvos = await $trpc.convos.getUserConvos.query({});
      convos.value.push(...userConvos.data);
      convoCursor.lastUpdatedAt = userConvos.cursor.lastUpdatedAt;
      convoCursor.lastPublicId = userConvos.cursor.lastPublicId;
      return;
    };
    const getNextConvos = async () => {
      if (
        convoCursor.lastUpdatedAt !== null &&
        convoCursor.lastPublicId !== null
      ) {
        const userConvos = await $trpc.convos.getUserConvos.query({
          cursorLastUpdatedAt: convoCursor.lastUpdatedAt,
          cursorLastPublicId: convoCursor.lastPublicId
        });
        convos.value.push(...userConvos.data);
        convoCursor.lastUpdatedAt = userConvos.cursor.lastUpdatedAt;
        convoCursor.lastPublicId = userConvos.cursor.lastPublicId;
      }
    };

    return {
      convos,
      getInitialConvos,
      getNextConvos
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
