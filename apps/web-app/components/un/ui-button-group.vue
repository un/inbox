<script lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiButtonGroup } from '#components';

  export default defineComponent<
    typeof NuxtUiButtonGroup extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiButtonGroup.props
    }
  });
</script>
<template>
  <NuxtUiButtonGroup v-bind="$props">
    <template #leading>
      <slot name="leading" />
    </template>
    <slot />
    <template #trailing>
      <slot name="trailing" />
    </template>
  </NuxtUiButtonGroup>
</template>
