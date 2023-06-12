<script setup lang="ts">
definePageMeta({
  middleware: ['hanko-logged-out']
});
</script>

<template>
  <div>
    <h1>Home</h1>
    <hanko-auth />
  </div>
</template>
