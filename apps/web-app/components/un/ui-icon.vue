<script lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiIcon } from '#components';

  export default defineComponent<
    typeof NuxtUiIcon extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiIcon.props
    }
  });
</script>
<template>
  <NuxtUiIcon v-bind="$props"> </NuxtUiIcon>
</template>
