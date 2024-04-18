<script setup lang="ts">
  import { useRoute, navigateTo } from '#imports';
  const orgShortcode = useRoute().params.orgShortcode as string;
  const urlParams = useRoute().query;
  const hasConvoDeletedError = urlParams['error'] === 'convo_deleted';
</script>
<template>
  <div
    class="flex h-full max-h-full w-full flex-col items-center justify-center gap-4 overflow-y-auto p-8">
    <div
      v-if="!hasConvoDeletedError"
      class="flex flex-col items-center justify-center gap-4">
      <div class="font-display flex flex-row gap-2 text-center text-xl">
        Oops, we cant find that conversation
      </div>

      <div class="flex flex-row gap-2 text-balance text-center text-lg">
        Either it doesn't exist, you don't have access to it, or it has been
        deleted
      </div>
    </div>
    <div
      v-if="hasConvoDeletedError"
      class="flex w-80 max-w-80 flex-col gap-4">
      <div class="">
        <UnUiAlert
          title="This conversation has been deleted"
          color="red"
          icon="i-ph-trash" />
      </div>
    </div>

    <div class="visible lg:hidden">
      <UnUiButton
        label="Back to conversations"
        size="lg"
        @click="navigateTo(`/${orgShortcode}/convo`)" />
    </div>
  </div>
</template>
