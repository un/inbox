export const useLocalPrefStore = defineStore(
  'localPref',
  () => {
    const colorModeControl = useColorMode();
    const currentColorMode = colorModeControl.value;
    if (colorModeControl.preference === 'system') {
      colorModeControl.value = 'light';
      colorModeControl.preference = 'light';
    }
    const toggleColorMode = async () => {
      const currentColorMode = colorModeControl.value;
      const newColorMode = currentColorMode === 'light' ? 'dark' : 'light';
      colorModeControl.value = newColorMode;
      colorModeControl.preference = newColorMode;
    };
    return {
      colorMode: currentColorMode,
      toggleColorMode
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
