<script setup lang="ts">
  import { useRoute, ref, watch } from '#imports';

  const orgShortcode = useRoute().params.orgShortcode as string;
  const route = useRoute();
  const isCollapsed = ref(true);

  watch(
    () => route.path,
    () => {
      isCollapsed.value = true;
    }
  );
</script>
<template>
  <div
    class="border-r-1 border-base-6 z-[30] flex h-full max-h-full flex-col gap-2 overflow-y-auto overflow-x-hidden pr-4 lg:w-full lg:pl-12"
    :class="isCollapsed ? 'w-24 p-4 lg:p-8' : 'w-[385px] p-8'">
    <div class="flex w-full flex-row justify-end">
      <UnUiButton
        square
        variant="ghost"
        :icon="isCollapsed ? 'i-ph-arrow-right' : 'i-ph-arrow-left'"
        class="lg:hidden"
        @click="isCollapsed = !isCollapsed" />
    </div>
    <div class="flex h-full max-h-full flex-col-reverse gap-2 md:flex-col">
      <div class="flex grow flex-col gap-0 overflow-hidden">
        <convos-convo-list
          :class="isCollapsed ? 'collapse lg:visible' : 'visible'" />
      </div>
      <div class="flex flex-row gap-2">
        <UnUiButton
          class="flex-grow justify-center"
          :class="isCollapsed ? 'collapse lg:visible' : 'visible'"
          :ui="{
            rounded: 'rounded-bl-xl'
          }"
          label="New"
          icon="i-ph-plus"
          variant="outline"
          :to="`/${orgShortcode}/convo/new`" />
      </div>
    </div>
  </div>
</template>
