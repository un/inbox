import { cva, type VariantProps } from 'class-variance-authority';
function generateAvatarUrl(id: string, size: string | undefined) {
  const imageUrlAccountHash = useRuntimeConfig().public.cfImagesAccountHash;
  if (imageUrlAccountHash) {
    return `https://imagedelivery.net/${imageUrlAccountHash}/${id}/${
      size ? size : ''
    }`;
  }
}

export const useUtils = () => {
  return { cva, generateAvatarUrl };
};

// TODO: Fix exporting types under namespace UseUtilTypes
export type { VariantProps };
