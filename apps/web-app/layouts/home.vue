<script setup lang="ts"></script>
<template>
  <div
    class="overflow-none flex h-full max-h-full w-full flex-row items-center">
    <layout-navbar class="z-40" />
    <div
      class="bg-base-1 dark:bg-base-1 -ml-4 h-full max-h-full w-full overflow-hidden">
      <slot />
    </div>
  </div>
</template>
