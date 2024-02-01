<script setup lang="ts">
  const route = useRoute();

  const hideChildren = computed(() => route.name === 'orgSlug-convo');
</script>
<template>
  <div
    class="bg-gray-100 dark:bg-gray-900 h-full max-h-full w-full flex flex-col items-center gap-4 overflow-hidden p-4 md:flex-row">
    <layout-navbar />
    <div
      class="bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800 h-full max-h-full w-full overflow-x-hidden overflow-y-auto border border-1 rounded-3xl md:overflow-hidden">
      <div
        class="grid grid-cols-1 min-h-full w-full justify-between overflow-hidden p-4 md:grid-cols-3 md:max-h-full">
        <ConvosSidebar
          class="h-full max-h-full"
          :class="{ hidden: !hideChildren }" />
        <div
          class="border-gray-200 dark:border-gray-800 col-span-2 w-full flex-col items-center justify-center gap-2 overflow-hidden border-b-0 border-l-1 border-r-0 border-t-0 md:h-full md:max-h-full md:flex md:border md:pl-4"
          :class="{ hidden: hideChildren }">
          <div class="w-full flex md:hidden">
            <a href="../"
              ><NuxtUiButton
                variant="outline"
                icon="i-ph-arrow-left"
                label="Back"
                square />
            </a>
          </div>
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
