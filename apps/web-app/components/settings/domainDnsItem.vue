<script setup lang="ts">
  const { copy, copied } = useClipboard();

  type DnsItemBlockProps = {
    title: string;
    value: string;
    hasCopyButton?: boolean;
  };

  const props = defineProps({
    title: { type: String, required: true },
    valid: { type: Boolean, required: true },
    text: { type: String, required: true },
    blocks: { type: Array as PropType<DnsItemBlockProps[]>, required: true },
    expanded: { type: Boolean, required: false, default: true }
  });

  const badgeColor = computed(() => {
    switch (props.valid) {
      case true:
        return 'bg-green-9';
      case false:
        return 'bg-red-9';
      default:
        return 'bg-base-9';
    }
  });
</script>
<template>
  <div
    class="h-fit w-full flex flex-col justify-center gap-4 rounded-2xl bg-base-2 p-8">
    <div
      class="flex flex-row cursor-pointer items-center justify-between"
      @click="$emit('clicked')">
      <span class="text-lg font-display">{{ props.title }}</span>
      <span
        class="rounded-full px-4 py-1 text-xs font-semibold uppercase text-base-1"
        :class="badgeColor">
        {{ props.valid ? 'Valid' : 'Invalid' }}
      </span>
    </div>
    <div
      v-show="props.expanded"
      class="flex flex-col justify-center gap-4">
      <div>
        <span class="">{{ props.text }}</span>
      </div>
      <div class="flex flex-row flex-wrap gap-4">
        <div
          v-for="block of props.blocks"
          :key="block.value">
          <div class="flex flex-col gap-1">
            <span class="overflow-hidden text-xs uppercase text-base-11">
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
              <UnUiTooltip
                v-if="block.hasCopyButton"
                text="Copy to clipboard">
                <UnUiIcon
                  name="i-ph-clipboard"
                  size="20"
                  @click="copy(block.value)" />
              </UnUiTooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
