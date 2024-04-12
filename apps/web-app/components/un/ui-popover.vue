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
    <template #panel="{ close }">
      <slot
        name="panel"
        v-bind="{ close }" />
    </template>
    <slot />
  </NuxtUiPopover>
</template>
