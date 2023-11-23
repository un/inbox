<script lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiDropdown } from '#components';

  export default defineComponent<
    typeof NuxtUiDropdown extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiDropdown.props
    }
  });
  //TODO: Fix this component
</script>
<template>
  <NuxtUiDropdown v-bind="$props">
    <slot />
  </NuxtUiDropdown>
</template>
