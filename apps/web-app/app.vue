<template>
  <div
    class="bg-base-1 dark:bg-base-1 selection:bg-base-11 selection:text-base-1 h-svh">
    <NuxtLayout class="h-svh">
      <NuxtPage />
    </NuxtLayout>
    <NuxtUiNotifications>
      <template #title="{ title }">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-html="title" />
      </template>
      <template #description="{ description }">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-html="description" />
      </template>
    </NuxtUiNotifications>
  </div>
</template>
<style>
  .page-enter-active,
  .page-leave-active {
    transition: all 0.1s;
  }
  .page-enter-from,
  .page-leave-to {
    opacity: 0;
    filter: blur(0.15rem);
    filter: grayscale(100%);
  }
  .layout-enter-active,
  .layout-leave-active {
    transition: all 0.1s;
  }
  .layout-enter-from,
  .layout-leave-to {
    opacity: 0;
    filter: blur(0.15rem);
    filter: grayscale(100%);
  }
</style>
