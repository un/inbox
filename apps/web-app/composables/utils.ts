import { cva, type VariantProps } from 'class-variance-authority';

export const useUtils = () => {
  return { cva };
};

// TODO: Fix exporting types under namespace UseUtilTypes
export type { VariantProps };
