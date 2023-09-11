<script setup lang="ts"></script>
<template>
  <div class="w-full h-full grid grid-cols-3 justify-between p-4">
    <div class="border-r-1 border-base-6 pr-4 flex flex-col justify-between">
      <div>one</div>
      <div class="flex flex-row gap-2">
        <button
          class="flex flex-row gap-4 p-2 border-1 w-full items-center justify-center border-base-7 bg-base-3">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">Start new</p>
        </button>
        <button
          class="flex flex-row gap-4 p-2 border-1 rounded w-full items-center justify-center border-base-7 bg-base-3">
          <icon
            name="ph-list-checks"
            size="20" />
          <p class="text-sm">Filter</p>
        </button>
      </div>
    </div>
    <div
      class="flex-col flex justify-center gap-2 items-center w-full col-span-2 pl-4">
      <div class="col-span-2 pl-4">Select a conversation from the left, or</div>
      <button
        class="flex flex-row gap-4 p-2 border-1 rounded w-full items-center justify-center border-base-7 bg-base-3 max-w-80">
        <icon
          name="ph-plus"
          size="20" />
        <p class="text-sm">Start new</p>
      </button>
    </div>
  </div>
</template>
