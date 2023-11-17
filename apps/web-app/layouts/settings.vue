<script setup lang="ts"></script>
<template>
  <div
    class="overflow-none bg-gray-100 dark:bg-gray-900 h-full max-h-full w-full flex flex-row items-center gap-4 p-4">
    <layout-navbar />
    <div
      class="bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800 h-full max-h-full w-full overflow-hidden border border-1 rounded-3xl">
      <div
        class="grid grid-cols-4 h-full max-h-full w-full justify-between overflow-hidden p-4">
        <SettingsSidebar class="h-full max-h-full" />
        <div
          class="border-gray-200 col-span-3 h-full max-h-full w-full flex flex-col items-center justify-center gap-2 overflow-hidden border border-b-0 border-l-1 border-r-0 border-t-0 pl-4">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
