<script setup lang="ts">
  import type { VariantProps } from 'class-variance-authority';
  type Props = {
    name?: string;
    count?: number;
    avatarId?: string;
    tooltipPreText?: string;
    size?: 'tiny' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    color?:
      | 'base'
      | 'red'
      | 'purple'
      | 'green'
      | 'yellow'
      | 'pink'
      | 'blue'
      | string;
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
        tiny: 'w-[16px] h-[16px] text-xs rounded-md',
        xs: 'w-[32px] h-[32px] text-sm rounded-md',
        sm: 'w-[48px] h-[48px] text-base rounded-md',
        md: 'w-[56px] h-[56px] text-lg rounded-lg',
        lg: 'w-[64px] h-[64px] text-xl rounded-lg',
        xl: 'w-[80px] h-[80px] text-2xl rounded-lg',
        '2xl': 'w-[128px] h-[128px] text-3xl rounded-xl'
      },
      color: {
        base: 'bg-base-3',
        red: 'bg-red-8',
        purple: 'bg-purple-8',
        green: 'bg-green-8',
        yellow: 'bg-yellow-8',
        pink: 'bg-pink-8',
        blue: 'bg-blue-8'
      }
    }
  });

  const tooltipText = props.tooltipPreText
    ? props.tooltipPreText + ': ' + props.name
    : props.name;
</script>
<template>
  <UnUiTooltip :text="tooltipText || ''">
    <div
      class="bg-cover bg-center font-display flex justify-center items-center"
      :class="avatarClasses({ container: props.size, color: props.color })"
      :style="
        props.avatarId
          ? `background-image: url(https://imagedelivery.net/${imageUrlAccountHash}/${
              props.avatarId
            }/${avatarClasses({ image: props.size })})`
          : ''
      ">
      {{
        props.avatarId
          ? ''
          : props.name
          ? props.name?.charAt(0)
          : props.count
          ? `+ ${props.count}`
          : ''
      }}
    </div>
  </UnUiTooltip>
</template>
