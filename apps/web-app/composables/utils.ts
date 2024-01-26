import { cva, type VariantProps } from 'class-variance-authority';
function generateAvatarUrl(
  type: 'user' | 'org' | 'group' | 'contact',
  avatarId: string,
  size:
    | '3xs'
    | '2xs'
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | undefined
) {
  const types = [
    { name: 'user', value: 'u' },
    { name: 'org', value: 'o' },
    { name: 'contact', value: 'c' },
    { name: 'group', value: 'g' }
  ];
  const typeObject = types.find((t) => t.name === type);
  if (!typeObject) {
    return null;
  }
  //@ts-ignore
  const storageBaseUrl = useRuntimeConfig().public.storageUrl;

  return `${storageBaseUrl}/avatar/${typeObject.value}_${avatarId}/${
    size ? size : '5xl'
  }`;
}

export const useUtils = () => {
  return { cva, generateAvatarUrl };
};

// TODO: Fix exporting types under namespace UseUtilTypes
export type { VariantProps };
