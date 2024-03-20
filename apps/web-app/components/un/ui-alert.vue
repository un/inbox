<script lang="ts">
  import { type DefineComponent, defineComponent } from 'vue';
  import { NuxtUiAlert } from '#components';

  export default defineComponent<
    typeof NuxtUiAlert extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiAlert.props
    }
  });
</script>
<template>
  <NuxtUiAlert
    v-bind="$props"
    class="w-full" />
</template>
