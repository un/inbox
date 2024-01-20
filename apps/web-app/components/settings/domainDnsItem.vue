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
    <div class="flex flex-row flex-wrap gap-4">
      <div
        v-for="block of props.blocks"
        :key="block.value">
        <div class="flex flex-col gap-1">
          <span class="overflow-hidden text-xs text-base-11 uppercase">
            {{ block.title }}
          </span>
          <div class="flex flex-row items-center gap-2">
            <div
              class="min-w-[50px] w-fit flex flex-col items-center rounded-lg bg-base-3 p-4">
              <span
                class="w-fit break-anywhere text-left text-sm font-mono"
                :class="block.title === 'Type' ? 'uppercase' : 'lowercase'">
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
