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
  <div>
    <NuxtUiAlert
      v-bind="$props"
      class="w-full">
      <template
        v-if="$slots.description"
        #description>
        <slot
          class="flex flex-col gap-8 p-4"
          name="description"></slot>
      </template>
    </NuxtUiAlert>
  </div>
</template>
