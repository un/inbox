<script lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiButton } from '#components';

  export default defineComponent<
    typeof NuxtUiButton extends DefineComponent<infer Props, any, any>
      ? Props & { otherProp?: string }
      : never
  >({
    props: {
      ...NuxtUiButton.props
      // otherProp: {
      //   type: String,
      //   required: false,
      //   default: 'default value for otherProp'
      // }
    }
  });
</script>

<template>
  <div class="w-full">
    <NuxtUiButton v-bind="$props"><slot /> </NuxtUiButton>
  </div>
</template>
