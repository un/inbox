<script setup lang="ts">
  import { ref } from 'vue';
  import { useClipboard } from '@vueuse/core';
  const { copy } = useClipboard();

  type Props = {
    text: string;
    helper?: string;
    icon?: string;
    color?: string;
    variant?: 'solid' | 'soft' | 'outline' | 'ghost';
    size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  };
  const props = withDefaults(defineProps<Props>(), {
    helper: 'Copy to clipboard',
    icon: 'i-ph-clipboard',
    color: 'accent',
    variant: 'soft',
    size: 'md'
  });

  const copiedString = ref('');

  async function copyString(value: string) {
    await copy(value);
    copiedString.value = value;
    setTimeout(() => {
      copiedString.value = '';
    }, 1500);
  }
</script>
<template>
  <UnUiTooltip :text="copiedString === props.text ? 'Copied' : props.helper">
    <UnUiButton
      square
      :icon="copiedString === props.text ? 'i-ph-check' : props.icon"
      :variant="props.variant"
      :size="props.size"
      :color="copiedString === props.text ? 'green' : props.color"
      @click="copyString(props.text)" />
  </UnUiTooltip>
</template>
