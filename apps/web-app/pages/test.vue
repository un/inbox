<script setup lang="ts">
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();

  const response = await $trpc.org.mail.domains.createNewDomain.mutate({
    orgPublicId: 'test',
    domainName: 'uninbox.com'
  });
</script>

<template>
  <div class="">
    {{ response }}
  </div>
</template>
