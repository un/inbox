<script lang="ts">
  import { type DefineComponent, defineComponent } from 'vue';
  import { NuxtUiPopover } from '#components';

  export default defineComponent<
    typeof NuxtUiPopover extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiPopover.props
    }
  });
</script>
<template>
  <NuxtUiPopover v-bind="$props">
    <template #panel>
      <slot name="panel"> </slot>
    </template>
    <slot />
  </NuxtUiPopover>
</template>
