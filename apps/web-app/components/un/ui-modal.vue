<script lang="ts">
  import { type DefineComponent, defineComponent } from 'vue';
  import { NuxtUiModal } from '#components';

  export default defineComponent<
    typeof NuxtUiModal extends DefineComponent<infer Props, any, any>
      ? Props & {
          hasClose?: boolean;
        }
      : never
  >({
    props: {
      ...NuxtUiModal.props,
      hasClose: {
        type: Boolean,
        default: true,
        optional: true
      }
    },
    emits: ['update:modelValue']
  });
</script>
<template>
  <NuxtUiModal
    v-bind="$props"
    @update:model-value="$emit('update:modelValue', $event)">
    <NuxtUiCard
      :ui="{
        ring: '',
        divide: 'divide-y divide-gray-100 dark:divide-gray-800'
      }">
      <template
        v-if="$slots.header || $props.hasClose"
        #header>
        <slot
          class="p-4"
          name="header"></slot>
        <UnUiButton
          v-if="$props.hasClose"
          class="absolute right-4 top-4"
          icon="i-ph-x"
          square
          variant="outline"
          @click="$emit('update:modelValue', false)" />
      </template>

      <slot class="flex flex-col gap-8 p-4"></slot>

      <template
        v-if="$slots.footer"
        #footer>
        <slot
          class="flex flex-col gap-8 p-4"
          name="footer"></slot>
      </template>
    </NuxtUiCard>
  </NuxtUiModal>
</template>
