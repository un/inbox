<script setup lang="ts">
  import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
    DialogTrigger
  } from 'radix-vue';

  type Props = {
    title?: string;
    description?: string;
    hasCloseButton?: boolean;
    isOpen: boolean;
  };

  const props = withDefaults(defineProps<Props>(), {
    title: undefined,
    description: undefined,
    hasCloseButton: true,
    isOpen: false
  });

  const slots = useSlots();

  const emit = defineEmits(['update:isOpen']);
  const openState = useVModel(props, 'isOpen', emit, { passive: true });
</script>
<template>
  <DialogRoot v-model:open="openState">
    <DialogTrigger
      v-if="slots.trigger"
      as-child>
      <slot name="trigger"></slot>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-20 justify-center items-center backdrop-blur backdrop-sepia backdrop-brightness-50 backdrop-grayscale">
        <DialogContent
          class="border-2 border-base-11 p-12 bg-base-3 w-full md:w-fit fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] rounded backdrop-opacity-90 flex flex-col gap-4 max-w-[80vw] md:max-w-[60vw]">
          <DialogTitle
            v-if="props.title"
            class="font-display text-lg">
            {{ props.title }}
          </DialogTitle>
          <DialogDescription v-if="props.description">
            {{ props.description }}
          </DialogDescription>
          <DialogClose
            class="text-primary-12 hover:text-primary-11 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center"
            aria-label="Close"
            @click="">
            <Icon name="ph-x" />
          </DialogClose>

          <slot class="flex flex-col gap-8"></slot>
        </DialogContent>
      </DialogOverlay>
    </DialogPortal>
  </DialogRoot>
</template>
