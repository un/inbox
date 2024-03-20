<script lang="ts">
  import { type DefineComponent, defineComponent } from 'vue';
  import { NuxtUiSkeleton } from '#components';

  export default defineComponent<
    typeof NuxtUiSkeleton extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiSkeleton.props
    }
  });
</script>
<template>
  <NuxtUiSkeleton v-bind="$props">
    <slot />
  </NuxtUiSkeleton>
</template>
