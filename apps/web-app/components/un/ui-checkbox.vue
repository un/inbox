<script lang="ts">
  import { type DefineComponent, defineComponent } from 'vue';
  import { NuxtUiCheckbox } from '#components';

  export default defineComponent<
    typeof NuxtUiCheckbox extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiCheckbox.props
    }
  });
</script>
<template>
  <NuxtUiCheckbox v-bind="$props">
    <slot />
  </NuxtUiCheckbox>
</template>
