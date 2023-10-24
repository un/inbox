<script setup lang="ts"></script>
<template>
  <div
    class="h-full max-h-full flex flex-col gap-2 overflow-y-scroll border-r-1 border-base-6 pr-4">
    <div class="flex grow flex-col gap-0 overflow-hidden">
      <convos-convo-list />

      <div class="mt-[-48px] h-[48px] from-base-1 bg-gradient-to-t" />
    </div>
    <div class="flex flex-row gap-2">
      <button
        class="w-full flex flex-row items-center justify-center gap-4 border-1 border-base-7 rounded rounded-bl-xl bg-base-3 p-2"
        @click="navigateTo('/h/convo/new')">
        <icon
          name="ph-plus"
          size="20" />
        <p class="text-sm">Start new</p>
      </button>
      <!-- <button
        class="flex flex-row gap-4 p-2 border-1 rounded w-full items-center justify-center border-base-7 bg-base-3">
        <icon
          name="ph-list-checks"
          size="20" />
        <p class="text-sm">Filter</p>
      </button> -->
    </div>
  </div>
</template>
