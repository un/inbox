<script lang="ts">
  import type { DefineComponent } from 'vue';
  import { NuxtUiVerticalNavigation } from '#components';

  export default defineComponent<
    typeof NuxtUiVerticalNavigation extends DefineComponent<
      infer Props,
      any,
      any
    >
      ? Props
      : never
  >({
    props: {
      ...NuxtUiVerticalNavigation.props
    }
  });
</script>
<template>
  <NuxtUiVerticalNavigation v-bind="$props">
    <template #avatar="{ link, isActive }">
      <!-- You can now use `link` and `isActive` inside this template -->
      <slot
        name="avatar"
        :link="link"
        :is-active="isActive" />
    </template>

    <template #icon="{ link, isActive }">
      <!-- You can now use `link` and `isActive` inside this template -->
      <slot
        name="icon"
        :link="link"
        :is-active="isActive" />
    </template>

    <template #default="{ link, isActive }">
      <!-- You can now use `link` and `isActive` inside this template -->
      <slot
        :link="link"
        :is-active="isActive" />
    </template>

    <template #badge="{ link, isActive }">
      <!-- You can now use `link` and `isActive` inside this template -->
      <slot
        name="badge"
        :link="link"
        :is-active="isActive" />
    </template>
  </NuxtUiVerticalNavigation>
</template>
