<script setup lang="ts">
  import { ref, computed, unref } from 'vue';
  import { watchDebounced } from '#imports';
  import { useUtils } from '~/composables/utils';
  import type { ZodTypeAny } from 'zod';
  import { useVModel } from '@vueuse/core';
  import { useFocus } from '@vueuse/core';
  import type { VariantProps } from 'class-variance-authority';

  type InputProps = VariantProps<typeof inputClasses>;

  type Props = {
    value?: string;
    label: string;
    placeholder?: string;
    icon?: string | null;
    disabled?: boolean;
    width?: InputProps['width'];
    locked?: boolean;
    helper?: string | null;
    schema?: ZodTypeAny | null;
    valid?: boolean | 'remote' | null;
    validationMessage?: string | null;
    remoteValidation?: boolean | null;
  };

  const props = withDefaults(defineProps<Props>(), {
    value: '',
    icon: null,
    placeholder: '',
    disabled: false,
    width: 'fit',
    locked: false,
    helper: null,
    schema: null,
    valid: null,
    validationMessage: null,
    remoteValidation: false
  });

  const inputClasses = useUtils().cva('', {
    variants: {
      width: {
        full: 'w-full',
        fit: 'sm:w-72 md:w-80'
      },
      color: {
        default: 'border-sand-7 focus-within:border-sand-8',
        valid: 'border-green-7 focus-within:border-green-8',
        invalid: 'border-red-11 focus-within:border-red-8',
        remote: 'border-orange-11 focus-within:border-orange-8'
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
  // const validationMessage = ref(props.validationMessage);
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
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      valid.value = false;
      return inputClasses({ color: 'invalid' });
    }
    // If no schema is passed, set to default
    if (!props.schema && !props.remoteValidation)
      return inputClasses({ color: 'default' });
    if (!props.schema && props.remoteValidation) {
      return inputClasses({ color: 'remote' });
    }

    if (data.value !== initialValue && !valid.value) {
      return inputClasses({ color: 'invalid' });
    }
    if (data.value && valid.value === true) {
      return inputClasses({ color: 'valid' });
    }
    if (data.value && valid.value === 'remote') {
      return inputClasses({ color: 'remote' });
    }

    return inputClasses({ color: 'default' });
  });

  const emit = defineEmits([
    'update:value',
    'update:valid',
    'update:validationMessage'
  ]);
  const data = useVModel(props, 'value', emit, { passive: true });
  const valid = useVModel(props, 'valid', emit, { passive: true });
  const validationMessage = useVModel(props, 'validationMessage', emit, {
    passive: true
  });

  // Locally Validate input against schema via props
  watchDebounced(
    data,
    async () => {
      if (props.schema) {
        const inputValidationResult = props.schema.safeParse(data.value);
        if (!inputValidationResult.success) {
          if (data.value === '') {
            // if empty, set to valid
            valid.value = true;
            validationMessage.value = null;
            return;
          }
          validationMessage.value =
            inputValidationResult.error.issues[0]?.message ?? '';
          valid.value = false;
          return;
        }
      }
      valid.value = props.remoteValidation ? 'remote' : true;
      validationMessage.value = null;
    },
    { debounce: 50, maxWait: 5000 }
  );
</script>

<template>
  <div
    class="text-primary-12 flex flex-row items-center gap-2"
    :class="inputClasses({ width: props.width })">
    <label
      :id="`input-label-${props.label}`"
      class="min-w-fit text-sm font-medium"
      >{{ props.label }}</label
    >

    <div
      class="bg-sand-1 focus-within:bg-sand-3 flex flex-row items-center gap-2 rounded border px-1 py-1"
      :class="[
        inputClasses({
          disabled: computedDisabled,
          width: props.width
        }),
        computedBorderColor
      ]">
      <div v-if="props.icon">
        <UnUiIcon :name="props.icon" />
      </div>
      <input
        ref="inputField"
        v-model="data"
        :aria-labelledby="`input-label-${props.label}`"
        class="placeholder:text-primary-12 w-full bg-transparent outline-none placeholder:opacity-70"
        :class="
          inputClasses({
            disabled: computedDisabled
          })
        "
        :disabled="computedDisabled"
        :placeholder="props.placeholder" />
      <button
        v-if="props.locked"
        class="hover:text-primary-11 text-sm font-medium"
        @click="toggleEditMode()">
        edit
      </button>
      <UnUiTooltip
        v-if="props.helper"
        :text="props.helper"
        ><UnUiIcon
          name="i-ph-question"
          class="cursor-help"
      /></UnUiTooltip>
    </div>
    <span
      v-if="validationMessage"
      class="text-red-11 w-full truncate text-right text-xs"
      >{{ validationMessage }}</span
    >
    <span
      v-if="valid === 'remote'"
      class="text-orange-11 w-full truncate text-right text-xs"
      >Verifying...</span
    >
  </div>
</template>
