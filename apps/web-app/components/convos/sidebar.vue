<script setup lang="ts"></script>
<template>
  <div class="border-r-1 border-base-6 pr-4 flex flex-col justify-between">
    <div>one</div>
    <div class="flex flex-row gap-2">
      <button
        class="flex flex-row gap-4 p-2 border-1 rounded w-full items-center justify-center border-base-7 bg-base-3 rounded-bl-xl">
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
</template>
