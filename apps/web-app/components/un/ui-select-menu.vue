<script lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiSelectMenu } from '#components';

  export default defineComponent<
    typeof NuxtUiSelectMenu extends DefineComponent<infer Props, any, any>
      ? Props
      : never
  >({
    props: {
      ...NuxtUiSelectMenu.props
    }
  });
</script>
<template>
  <NuxtUiSelectMenu v-bind="$props">
    <template #label>
      <slot name="label"> </slot>
    </template>

    <slot></slot>

    <template #option>
      <slot name="option"> </slot>
    </template>

    <template #option-create>
      <slot name="option-create"> </slot>
    </template>
  </NuxtUiSelectMenu>
</template>
