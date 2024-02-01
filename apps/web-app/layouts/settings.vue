<script setup lang="ts">
  const route = useRoute();
  console.log(route.name);
  const hideChildren = computed(() => route.name === 'orgSlug-settings');
</script>
<template>
  <div
    class="overflow-none bg-gray-100 dark:bg-gray-900 h-full max-h-full w-full flex flex-col items-center gap-4 p-4 md:flex-row">
    <layout-navbar />
    <div
      class="bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800 h-full max-h-full w-full overflow-hidden border border-1 rounded-3xl">
      <div
        class="grid h-full max-h-full w-full justify-between overflow-hidden p-4 md:grid-cols-4">
        <SettingsSidebar
          class="h-full max-h-full"
          :class="{ hidden: !hideChildren }" />
        <div
          class="border-gray-200 dark:border-gray-800 min-h-full w-full flex flex-col items-center justify-center gap-2 overflow-x-hidden overflow-y-auto border-b-0 border-l-1 border-r-0 border-t-0 pl-4 md:col-span-3 md:max-h-full md:border"
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
