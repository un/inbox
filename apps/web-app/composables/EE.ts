export const useEE = () => {
  const eeConfig = useRuntimeConfig().public.ee;
  return {
    config: eeConfig
  };
};
