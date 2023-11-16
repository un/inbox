<script setup lang="ts"></script>
<template>
  <div
    class="overflow-none bg-gray-100 dark:bg-gray-900 h-full max-h-full w-full flex flex-row items-center gap-4 p-4">
    <layout-navbar />
    <div
      class="bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800 h-full max-h-full w-full overflow-hidden border border-1 rounded-3xl">
      <slot />
    </div>
  </div>
</template>
