<script setup lang="ts">
  const orgSlug = useRoute().params.orgSlug as string;
  navigateTo(`/${orgSlug}/convo`);
</script>
<template><div></div></template>
