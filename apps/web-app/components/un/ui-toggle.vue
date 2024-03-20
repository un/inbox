<script lang="ts">
  import { type DefineComponent, defineComponent } from 'vue';
  import { NuxtUiToggle } from '#components';

  export default defineComponent<
    typeof NuxtUiToggle extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiToggle.props
    },
    emits: ['update:modelValue']
  });
</script>
<template>
  <NuxtUiToggle
    v-bind="$props"
    @update:model-value="$emit('update:modelValue', $event)">
    <slot />
  </NuxtUiToggle>
</template>
