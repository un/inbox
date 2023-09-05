<script setup lang="ts">
  import { CheckboxIndicator, CheckboxRoot } from 'radix-vue';

  type Props = {
    value: boolean;
    name?: string;
    label?: string;
  };

  const props = withDefaults(defineProps<Props>(), {
    value: false,
    name: '',
    label: ''
  });

  const slots = useSlots();

  const emit = defineEmits(['update:value']);
  const checked = useVModel(props, 'value', emit, { passive: true });
</script>
<template>
  <div>
    <label class="flex flex-row gap-4 items-start">
      <CheckboxRoot
        v-model:checked="checked"
        :name="props.name"
        :aria-label="props.label"
        class="shadow-base-7 hover:(bg-base-4 border-base-8) flex min-h-[25px] min-w-[25px] appearance-none items-center justify-center rounded bg-base-3 border-base-7 border-2">
        <CheckboxIndicator
          class="bg-base-3 h-full w-full flex items-center justify-center">
          <Icon
            name="ph-check-bold"
            class="h-3.5 w-3.5 text-primary-11" />
        </CheckboxIndicator>
      </CheckboxRoot>
      <span
        v-if="label"
        class="select-none text-left">
        {{ props.label }}
      </span>
    </label>
  </div>
</template>
