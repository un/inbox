export const useLocalPrefStore = defineStore(
  'localPref',
  () => {
    const sidebarCollapsed = ref<boolean>(false);

    const toggleSidebar = async () => {
      console.log('toggleSidebar');
      sidebarCollapsed.value = !sidebarCollapsed.value;
    };

    const colorMode = useColorMode();
    if (colorMode.preference === 'system') {
      colorMode.value = 'light';
      colorMode.preference = 'light';
    }
    const toggleColorMode = async () => {
      const currentColorMode = colorMode.value;
      const newColorMode = currentColorMode === 'light' ? 'dark' : 'light';
      colorMode.value = newColorMode;
      colorMode.preference = newColorMode;
    };
    return {
      toggleColorMode,
      sidebarCollapsed,
      toggleSidebar
    };
  },
  {
    share: { enable: true },
    persist: {
      storage: persistedState.localStorage
    }
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConvoStore, import.meta.hot));
}
