<script lang="ts">
  import { type DefineComponent, defineComponent } from 'vue';
  import { NuxtUiAvatarGroup } from '#components';

  export default defineComponent<
    typeof NuxtUiAvatarGroup extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiAvatarGroup.props
    }
  });

  //TODO: This component does not work, NuxtUiAvatarGroup has been used in the code
</script>
<template>
  <NuxtUiAvatarGroup v-bind="$props">
    <slot />
  </NuxtUiAvatarGroup>
</template>
