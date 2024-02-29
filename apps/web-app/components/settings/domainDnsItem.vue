<script setup lang="ts">
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
  <div class="mr-10 h-fit w-full flex flex-col justify-center gap-4 p-3.5">
    <div>
      <span class="">{{ props.text }}</span>
    </div>
    <div class="flex flex-row flex-wrap gap-4 w-full max-w-full">
      <div
        v-for="block of props.blocks"
        :key="block.value">
        <div class="flex flex-col w-full max-w-full gap-1">
          <span class="overflow-hidden text-xs uppercase">
            {{ block.title }}
          </span>
          <div class="flex flex-row items-center gap-2 w-full max-w-full">
            <div
              class="max-w-full min-w-[50px] flex flex-col items-center rounded-lg bg-gray-100 p-4">
              <span
                class="w-full break-all text-left text-sm font-mono"
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
