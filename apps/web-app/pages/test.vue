<script setup lang="ts">
  const responses: string[] = [];

  for (let i = 0; i < 50; i++) {
    console.log('🔥', i);
    const {
      pending: p2,
      data: count2,
      refresh: r2
    } = await useLazyAsyncData(
      'count',
      async () => {
        const response = await $fetch('/api/test');
        responses.push(response);
        console.log('🔥', i, response);
        return response;
      },
      { server: false }
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
</script>

<template>
  <div class="max-w-72 w-72">
    {{ responses.length }}
    <span
      v-for="response of responses"
      :key="response"
      >{{ response }}</span
    >
  </div>
</template>
