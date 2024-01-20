<script setup lang="ts">
  const { copy } = useClipboard();
  const props = defineProps({
    text: { type: String, required: true }
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
  <UnUiTooltip
    :text="copiedString === props.text ? 'Copied' : 'Copy to clipboard'">
    <UnUiButton
      square
      :icon="copiedString === props.text ? 'i-ph-check' : 'i-ph-clipboard'"
      variant="soft"
      :color="copiedString === props.text ? 'green' : 'gray'"
      @click="copyString(props.text)" />
  </UnUiTooltip>
</template>
