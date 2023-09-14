<script setup lang="ts">
  import { useConvoStore } from '@/stores/convoStore';

  const convoStore = useConvoStore();
  if (process.client && convoStore.convos.length === 0) {
    await convoStore.getInitialConvos();
  }
  console.log(convoStore.convos.length);
</script>
<template>
  <div
    class="flex flex-col items-start gap-4 overflow-scroll max-w-full w-full">
    <div
      v-for="convo of convoStore.convos"
      :id="convo.publicId"
      @click="navigateTo(`/h/convo/${convo.publicId}`)"
      class="max-w-full">
      <convos-convo-list-item :convo="convo" />
    </div>
  </div>
</template>
