<script setup>
  import { onMounted, useNuxtApp, useToast, ref } from '#imports';
  const toast = useToast();
  const skipUpdate = ref(false);
  const { $pwa } = useNuxtApp();

  onMounted(() => {
    if ($pwa?.offlineReady) {
      toast.add({
        title: 'Account created',
        description: 'Uninbox is Ready to be Installed as PWA',
        color: 'green',
        timeout: 5000,
        icon: 'i-ph-check-circle'
      });
    }
  });
</script>

<template>
  <NuxtPwaAssets />
  <div
    class="bg-base-1 dark:bg-base-1 selection:bg-base-11 selection:text-base-1 h-screen max-h-screen">
    <NuxtLayout class="h-screen max-h-screen">
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
    <UnUiModal v-show="$pwa?.needRefresh && !skipUpdate">
      <template #header>
        <span>Update Available</span>
      </template>
      <div class="flex w-full flex-col gap-4">
        <p>
          UnInbox has been Updated! Update to get the latest and greatest
          features.
        </p>
        <p>It takes only a second to update.</p>
        <div class="mt-4 flex w-full flex-row justify-center gap-4">
          <UnUiButton
            label="Later"
            size="lg"
            variant="outline"
            icon="i-ph-x"
            @click="skipUpdate = false" />
          <UnUiButton
            label="Update"
            size="lg"
            color="green"
            icon="i-ph-check"
            @click="$pwa?.updateServiceWorker()" />
        </div>
      </div>
    </UnUiModal>
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
