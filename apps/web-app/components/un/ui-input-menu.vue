<script lang="ts">
  import { type DefineComponent, defineComponent } from 'vue';
  import { NuxtUiInputMenu } from '#components';

  export default defineComponent<
    typeof NuxtUiInputMenu extends DefineComponent<infer Props, any, any>
      ? Props & {
          label?: string;
        }
      : never
  >({
    props: {
      ...NuxtUiInputMenu.props,
      label: {
        type: String,
        default: ''
      }
    }
  });
</script>
<template>
  <div class="text-primary-12 flex flex-col gap-1 leading-4">
    <div v-if="$props.label">
      <label
        :id="`input-label-${$props.label}`"
        class="min-w-fit text-sm font-medium">
        {{ $props.label }}
      </label>
    </div>
    <NuxtUiInputMenu v-bind="$props"> </NuxtUiInputMenu>
  </div>
</template>
