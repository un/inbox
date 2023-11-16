<script lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiModal } from '#components';

  export default defineComponent<
    typeof NuxtUiModal extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiModal.props
    }
  });
</script>
<template>
  <NuxtUiModal v-bind="$props">
    <NuxtUiCard
      :ui="{
        ring: '',
        divide: 'divide-y divide-gray-100 dark:divide-gray-800'
      }">
      <template #header>
        <slot
          class="flex flex-col gap-8"
          name="header"></slot>
      </template>

      <slot class="flex flex-col gap-8"></slot>

      <template #footer>
        <slot
          class="flex flex-col gap-8"
          name="footer"></slot>
      </template>
    </NuxtUiCard>
  </NuxtUiModal>
</template>
