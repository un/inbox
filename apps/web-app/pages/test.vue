<script setup lang="ts">
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();
  definePageMeta({ auth: false });

  const result = await $trpc.test.runTest.query({ username: 'test' });
</script>

<template>
  <div class="">
    {{ $route.path }}
    {{ result }}
  </div>
</template>
