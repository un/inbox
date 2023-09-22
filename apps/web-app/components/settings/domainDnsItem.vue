<script setup lang="ts">
  const { copy, copied, text } = useClipboard();

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
    class="flex flex-col gap-4 justify-center p-8 bg-base-2 rounded-2xl w-full h-fit">
    <div
      class="flex flex-row justify-between items-center cursor-pointer"
      @click="$emit('clicked')">
      <span class="font-display text-lg">{{ props.title }}</span>
      <span
        class="text-xs font-semibold text-base-1 uppercase py-1 px-4 rounded-full bg-red-9"
        :class="badgeColor">
        {{ props.valid ? 'Valid' : 'Invalid' }}
      </span>
    </div>
    <div
      v-show="props.expanded"
      class="flex flex-col gap-4 justify-center">
      <div>
        <span class="">{{ props.text }}</span>
      </div>
      <div class="flex flex-row gap-4 flex-wrap">
        <div v-for="block of props.blocks">
          <div class="flex flex-col gap-1">
            <span class="text-xs uppercase text-base-11 overflow-hidden">
              {{ block.title }}
            </span>
            <div class="flex flex-row gap-2 items-center">
              <div
                class="flex flex-col bg-base-3 p-4 rounded-lg w-fit min-w-[50px] items-center">
                <span
                  class="text-sm font-mono break-anywhere text-left w-fit"
                  :class="block.title === 'Type' ? 'uppercase' : 'lowercase'">
                  {{ block.value }}
                </span>
              </div>
              <UnUiTooltip
                text="Copy to clipboard"
                v-if="block.hasCopyButton">
                <icon
                  name="ph-clipboard"
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
