export const useLocalPrefStore = definePiniaStore(
  'localPref',
  () => {
    const colorMode = ref<'light' | 'dark'>('light');
    const sidebarCollapsed = ref<boolean>(false);

    const toggleSidebar = async () => {
      console.log('toggleSidebar');
      sidebarCollapsed.value = !sidebarCollapsed.value;
    };

    const toggleColorMode = async () => {
      colorMode.value = colorMode.value === 'light' ? 'dark' : 'light';
      useColorMode().value = colorMode.value;
    };
    return {
      colorMode,
      toggleColorMode,
      sidebarCollapsed,
      toggleSidebar
    };
  },
  {
    share: { enable: true }
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConvoStore, import.meta.hot));
}
