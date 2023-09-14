<script setup lang="ts">
  import type { VariantProps } from 'class-variance-authority';
  type Props = {
    name: string;
    avatarId?: string | null;
    tooltipPreText?: string;
    size?: 'tiny' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    color?: 'base' | 'red' | 'purple' | 'green' | 'yellow' | 'pink' | 'blue';
  };

  const props = withDefaults(defineProps<Props>(), {
    name: '',
    size: 'md',
    color: 'base'
  });
  const imageUrlAccountHash = useRuntimeConfig().public.cfImagesAccountHash;

  const avatarClasses = useUtils().cva('', {
    variants: {
      image: {
        tiny: '32x32',
        xs: '32x32',
        sm: '48x48',
        md: '56x56',
        lg: '64x64',
        xl: '80x80',
        '2xl': '128x128'
      },
      container: {
        tiny: 'w-[16px] h-[16px] text-xs',
        xs: 'w-[32px] h-[32px] text-sm',
        sm: 'w-[48px] h-[48px] text-base',
        md: 'w-[56px] h-[56px] text-lg',
        lg: 'w-[64px] h-[64px] text-xl',
        xl: 'w-[80px] h-[80px] text-2xl',
        '2xl': 'w-[128px] h-[128px] text-3xl'
      },
      color: {
        base: 'bg-base-3',
        red: 'bg-red-9',
        purple: 'bg-purple-9',
        green: 'bg-green-9',
        yellow: 'bg-yellow-9',
        pink: 'bg-pink-9',
        blue: 'bg-blue-9'
      }
    }
  });

  const tooltipText = props.tooltipPreText
    ? props.tooltipPreText + ': ' + props.name
    : props.name;
</script>
<template>
  <UnUiTooltip :text="tooltipText">
    <div
      class="rounded-2 bg-cover bg-center font-display text-base-12 flex justify-center items-center"
      :class="avatarClasses({ container: props.size, color: props.color })"
      :style="
        props.avatarId
          ? `background-image: url(https://imagedelivery.net/${imageUrlAccountHash}/${
              props.avatarId
            }/${avatarClasses({ image: props.size })})`
          : ''
      ">
      {{ props.avatarId ? '' : props.name.charAt(0) }}
    </div>
  </UnUiTooltip>
</template>
