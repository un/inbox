<script setup lang="ts">
  const { $trpc, $i18n } = useNuxtApp();
  const emit = defineEmits(['success', 'error', 'close']);

  const toast = useToast();
</script>

<template></template>
