<script setup lang="ts">
  import { createHead } from 'unhead';
  const head = createHead();
  // import { navigateTo } from '#imports';
</script>
<template>
  <div
    class="bg-base-1 dark:bg-base-1 selection:bg-base-11 selection:text-base-1 h-svh">
    <NuxtLayout class="h-svh">
      <!-- <UnUiAlert
        title="We're on live on Product Hunt today! Upvote us to show your support and help spread the word!"
        icon="i-ph-rocket"
        :actions="[
          {
            variant: 'solid',
            color: 'base',
            label: 'Upvote us',
            click: () =>
              navigateTo('https://unn.sh/ph', {
                external: true,
                open: { target: '_blank' }
              })
          }
        ]"
        class="text-base-1"
        color="amber" /> -->
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
