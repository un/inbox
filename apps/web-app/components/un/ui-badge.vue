<script lang="ts">
  import { type DefineComponent, defineComponent } from 'vue';
  import { NuxtUiBadge } from '#components';

  export default defineComponent<
    typeof NuxtUiBadge extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiBadge.props
    }
  });
</script>
<template>
  <NuxtUiBadge v-bind="$props">
    <slot />
  </NuxtUiBadge>
</template>
