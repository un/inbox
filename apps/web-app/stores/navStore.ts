export const useNavStore = definePiniaStore(
  'navStore',
  () => {
    const settingsSelectedOrg = ref('');
    const userHasAdminOrgs = ref(false);

    return {
      settingsSelectedOrg,
      userHasAdminOrgs
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
