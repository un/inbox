<script setup lang="ts"></script>
<template>
  <div class="h-full max-h-full max-w-full w-full overflow-hidden">
    <NuxtLayout name="home">
      <div
        class="grid grid-cols-4 h-full max-h-full w-full justify-between overflow-hidden p-4">
        <SettingsSidebar class="h-full max-h-full" />
        <div
          class="border-gray-200 dark:border-gray-800 col-span-3 h-full max-h-full w-full flex flex-col items-center justify-center gap-2 overflow-hidden border border-b-0 border-l-1 border-r-0 border-t-0 pl-4">
          <slot />
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>
