<template>
  <div
    class="w-80 flex flex-col gap-1 leading-4 text-primary-12"
    :class="inputClasses({ width: props.width })">
    <div class="flex flex-row justify-between gap-4">
      <label
        :id="`input-label-${props.label}`"
        class="text-sm font-medium"
        >{{ props.label }}</label
      >
      <span
        v-if="validationMessage"
        class="w-full truncate text-right text-sm text-red-11"
        >{{ validationMessage }}</span
      >
    </div>
    <div
      class="flex flex-row items-center gap-2 border rounded bg-sand-3 px-2 py-2 focus-within:bg-sand-4"
      :class="[
        inputClasses({
          disabled: computedDisabled
        }),
        computedBorderColor
      ]">
      <div v-if="props.icon">
        <Icon :name="props.icon" />
      </div>
      <input
        ref="inputField"
        v-model="data"
        :aria-labelledby="`input-label-${props.label}`"
        class="font-lg w-full bg-transparent outline-none placeholder:text-primary-12 placeholder:opacity-70"
        :class="
          inputClasses({
            disabled: computedDisabled
          })
        "
        :disabled="computedDisabled"
        :placeholder="props.placeholder" />
      <button
        v-if="props.locked"
        class="text-sm font-medium hover:text-primary-11"
        @click="toggleEditMode()">
        edit
      </button>
      <UnUiTooltip
        v-if="props.helper"
        :text="props.helper"
        ><Icon
          name="ph:question"
          class="cursor-help"
      /></UnUiTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { ZodTypeAny } from 'zod';
  import { useVModel } from '@vueuse/core';
  import { useFocus } from '@vueuse/core';
  import type { VariantProps } from 'class-variance-authority';

  type InputProps = VariantProps<typeof inputClasses>;

  type Props = {
    value?: string;
    label: string;
    placeholder: string;
    icon?: string | null;
    disabled?: boolean;
    width?: InputProps['width'];
    locked?: boolean;
    helper?: string | null;
    schema?: ZodTypeAny | null;
    valid?: boolean | null;
    validationMessage?: string | null;
  };

  const props = withDefaults(defineProps<Props>(), {
    value: '',
    icon: null,
    disabled: false,
    width: 'fit',
    locked: false,
    helper: null,
    schema: null,
    valid: null,
    validationMessage: null
  });

  const inputClasses = useUtils().cva('', {
    variants: {
      width: {
        full: 'w-full',
        fit: 'w-80'
      },
      color: {
        default: 'border-sand-7 focus-within:border-sand-8',
        valid: 'border-green-7 focus-within:border-green-8',
        invalid: 'border-red-11 focus-within:border-red-8'
      },
      disabled: {
        true: 'cursor-not-allowed',
        false: 'cursor-text'
      }
    }
  });

  const editModeEnabled = ref(false);
  const inputField = ref();
  // const valid = ref(props.valid);
  const validationMessage = ref(props.validationMessage);
  const initialValue = unref(props.value);

  // Switch Focus to input field when edit mode is enabled
  const { focused: inputFocus } = useFocus(inputField);
  function toggleEditMode() {
    editModeEnabled.value = !editModeEnabled.value;
    // we need a small timeout here to allow the input to become enabled again
    setTimeout(() => {
      inputFocus.value = !inputFocus.value;
    }, 10);
  }
  // Computed properties
  const computedDisabled = computed(() => {
    return props.locked ? !editModeEnabled.value : props.disabled;
  });
  const computedBorderColor = computed(() => {
    // If external/remote validation failed and message passed to component, always set to invalid
    if (validationMessage.value) {
      valid.value = false;
      return inputClasses({ color: 'invalid' });
    }
    // If no schema is passed, set to default
    if (!props.schema) return inputClasses({ color: 'default' });
    if (props.schema) {
      if (data.value !== initialValue && !valid.value) {
        return inputClasses({ color: 'invalid' });
      }
      if (data.value && valid.value) {
        return inputClasses({ color: 'valid' });
      }
    }
    return inputClasses({ color: 'default' });
  });

  const emit = defineEmits(['update:value', 'update:valid']);
  const data = useVModel(props, 'value', emit, { passive: true });
  const valid = useVModel(props, 'valid', emit, { passive: true });

  // Locally Validate input against schema via props
  watchDebounced(
    data,
    async () => {
      if (!props.schema) return;
      const inputValidationResult = props.schema.safeParse(data.value);
      if (!inputValidationResult.success) {
        validationMessage.value = inputValidationResult.error.issues[0].message;
        return;
      }
      valid.value = true;
      validationMessage.value = null;
    },
    { debounce: 350, maxWait: 5000 }
  );
</script>
