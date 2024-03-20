<script lang="ts">
  import { type DefineComponent, defineComponent } from 'vue';
  import { NuxtUiDivider } from '#components';

  export default defineComponent<
    typeof NuxtUiDivider extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiDivider.props
    }
  });
</script>
<template>
  <NuxtUiDivider v-bind="$props">
    <template #default>
      <slot />
    </template>
  </NuxtUiDivider>
</template>
