<script setup lang="ts">
  import { CheckboxIndicator, CheckboxRoot } from 'radix-vue';

  type Props = {
    value: boolean;
    name?: string;
    label?: string;
    helperText?: string;
  };

  const props = withDefaults(defineProps<Props>(), {
    value: false,
    name: '',
    label: '',
    helperText: ''
  });

  const slots = useSlots();

  const emit = defineEmits(['update:value']);
  const checked = useVModel(props, 'value', emit, { passive: true });
</script>
<template>
  <div>
    <label class="flex flex-row items-start gap-4">
      <CheckboxRoot
        v-model:checked="checked"
        :name="props.name"
        :aria-label="props.label"
        class="min-h-[25px] min-w-[25px] flex appearance-none items-center justify-center border-2 border-base-7 rounded bg-base-3 shadow-base-7 hover:(border-base-8 bg-base-4)">
        <CheckboxIndicator
          class="h-full w-full flex items-center justify-center bg-base-3">
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
      <UnUiTooltip
        v-if="props.helperText"
        :text="props.helperText">
        <Icon
          name="ph-info"
          class="h-6 w-6" />
      </UnUiTooltip>
    </label>
  </div>
</template>
