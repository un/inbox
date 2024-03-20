<script setup lang="ts">
  import { type PropType } from 'vue';
  type DnsItemBlockProps = {
    title: string;
    value: string;
    hasCopyButton?: boolean;
  };

  const props = defineProps({
    text: { type: String, required: true },
    blocks: { type: Array as PropType<DnsItemBlockProps[]>, required: true }
  });
</script>
<template>
  <div class="mr-10 flex h-fit w-full flex-col justify-center gap-4 p-3.5">
    <div>
      <span class="text-base-11">{{ props.text }}</span>
    </div>
    <div class="flex w-full max-w-full flex-row flex-wrap gap-4">
      <div
        v-for="block of props.blocks"
        :key="block.value">
        <div class="flex w-full max-w-full flex-col gap-1">
          <span class="overflow-hidden text-xs uppercase">
            {{ block.title }}
          </span>
          <div class="flex w-full max-w-full flex-row items-center gap-2">
            <div
              class="bg-base-3 flex min-w-[50px] max-w-full flex-col items-center rounded-lg p-4">
              <span
                class="text-base-12 w-full break-all text-left font-mono text-sm"
                :class="block.title === 'Type' ? 'uppercase' : ''">
                {{ block.value }}
              </span>
            </div>
            <UnUiCopy
              v-if="block.hasCopyButton"
              :text="block.value" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
