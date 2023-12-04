function generateAvatarUrl(id: string, size: string | undefined) {
  // TODO: if cloudflare images are not enabled via config, return a default/ placeholder image
  const imageUrlAccountHash = useRuntimeConfig().public.cfImagesAccountHash;
  if (imageUrlAccountHash) {
    return `https://imagedelivery.net/${imageUrlAccountHash}/${id}/${
      size ? size : ''
    }`;
  }
}

export const useUtils = () => {
  return { generateAvatarUrl };
};
