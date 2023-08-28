<template>
  <button
    :class="[buttonClasses({ ...props })]"
    :disabled="props.disabled || props.loading">
    <div
      v-if="props.icon"
      :class="iconClasses({ container: props.size })">
      <Icon
        :name="props.loading ? 'svg-spinners:3-dots-fade' : props.icon"
        :size="iconClasses({ size: props.size })" />
    </div>
    <p>{{ props.label }}</p>
  </button>
</template>

<script setup lang="ts">
  import type { VariantProps } from 'class-variance-authority';
  type ButtonProps = VariantProps<typeof buttonClasses>;

  type Props = {
    label: string;
    icon?: string;
    trailing?: boolean;
    disabled?: boolean;
    loading?: boolean;
    size?: ButtonProps['size'];
    width?: ButtonProps['width'];
    color?: ButtonProps['color'];
    variant?: ButtonProps['variant'];
  };

  const props = withDefaults(defineProps<Props>(), {
    icon: undefined,
    trailing: false,
    disabled: false,
    loading: false,
    size: 'md',
    width: 'fit',
    color: 'primary',
    variant: 'solid'
  });

  const iconClasses = useUtils().cva('', {
    variants: {
      size: {
        sm: '1rem',
        md: '1.5rem'
      },
      container: {
        sm: 'w-[1rem] h-[1rem]',
        md: 'w-[1.5rem] h-[1.5rem]'
      }
    }
  });

  const buttonClasses = useUtils().cva(
    'rounded flex items-center justify-center',
    {
      variants: {
        size: {
          sm: 'py-2 px-4 text-sm font-medium leading-4 gap-3',
          md: 'py-3 px-6 text-base font-medium leading-6 gap-4'
        },
        width: {
          full: 'w-full',
          fit: 'w-fit'
        },
        color: {
          primary: '',
          red: '',
          green: '',
          base: ''
        },
        variant: {
          solid: '',
          outline: '',
          soft: ''
        },
        disabled: {
          true: 'opacity-70 saturate-50 cursor-not-allowed'
        },
        loading: {
          true: 'cursor-wait'
        },
        trailing: {
          true: 'flex-row-reverse',
          false: 'flex-row'
        }
      },
      compoundVariants: [
        {
          variant: 'solid',
          color: 'primary',
          class:
            'bg-primary-9 text-black enabled:(hover:bg-primary-10 active:bg-primary-11)'
        },
        {
          variant: 'solid',
          color: 'red',
          class:
            'bg-red-9 text-white enabled:(hover:bg-red-10 active:bg-red-11)'
        },
        {
          variant: 'solid',
          color: 'green',
          class:
            'bg-green-9 text-white enabled:(hover:bg-green-10 active:bg-green-11)'
        },
        {
          variant: 'solid',
          color: 'base',
          class:
            'bg-base-9 text-black enabled:(hover:bg-base-10 active:bg-base-11)'
        },
        {
          variant: 'outline',
          color: 'primary',
          class:
            'bg-primary-1 text-primary-11 border border-primary-7 enabled:(hover:(bg-primary-2 border-primary-8) active:bg-primary-3)'
        },
        {
          variant: 'outline',
          color: 'red',
          class:
            'bg-red-1 text-red-11 border border-red-7 enabled:(hover:(bg-red-2 border-red-8) active:bg-red-3)'
        },
        {
          variant: 'outline',
          color: 'green',
          class:
            'bg-green-1 text-green-11 border border-green-7 enabled:(hover:(bg-green-2 border-green-8) active:bg-green-3)'
        },
        {
          variant: 'outline',
          color: 'base',
          class:
            'bg-base-1 text-base-11 border border-base-7 enabled:(hover:(bg-base-2 border-base-8) active:bg-base-3)'
        },
        {
          variant: 'soft',
          color: 'primary',
          class:
            'bg-primary-3 text-primary-11 enabled:(hover:bg-primary-4 active:bg-primary-5)'
        },
        {
          variant: 'soft',
          color: 'red',
          class: 'bg-red-3 text-red-11 enabled:(hover:bg-red-4 active:bg-red-5)'
        },
        {
          variant: 'soft',
          color: 'green',
          class:
            'bg-green-3 text-green-11 enabled:(hover:bg-green-4 active:bg-green-5)'
        },
        {
          variant: 'soft',
          color: 'base',
          class:
            'bg-base-3 text-base-11 enabled:(hover:bg-base-4 active:bg-base-5)'
        }
      ]
    }
  );
</script>
