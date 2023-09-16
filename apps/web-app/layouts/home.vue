<script setup lang="ts"></script>
<template>
  <div
    class="flex flex-row w-full h-full max-h-full p-4 items-center bg-base-2 overflow-none gap-4">
    <layout-navbar />
    <div
      class="border-1 rounded-3xl w-full h-full border-base-6 bg-base-1 overflow-hidden max-h-full">
      <slot />
    </div>
  </div>
</template>
