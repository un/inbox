<script setup lang="ts"></script>
<template>
  <div
    class="flex flex-row w-full h-full max-h-full p-4 items-center bg-base-2 overflow-none gap-4">
    <layout-navbar />
    <div
      class="border-1 rounded-3xl w-full h-full border-base-6 bg-base-1 overflow-hidden max-h-full">
      <div
        class="w-full grid grid-cols-3 justify-between p-4 h-full max-h-full overflow-hidden">
        <ConvosSidebar class="h-full max-h-full" />
        <div
          class="flex-col flex justify-center gap-2 items-center w-full col-span-2 pl-4 h-full max-h-full overflow-hidden">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
