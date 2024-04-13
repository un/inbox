<script setup lang="ts">
  import { ref, useNuxtApp, useToast } from '#imports';

  const { $trpc } = await useNuxtApp();

  const username = ref<string>('');

  const functionResult = ref({});
  const toast = useToast();

  const accountData = ref<{} | null>(null);

  async function getAccountData() {
    const { data } = await $trpc.accounts.getAccountData.useQuery({
      username: username.value
    });
    accountData.value = data.value || {};
  }

  async function giveUninBonus() {
    if (!accountData.value) return;
    const result = await $trpc.accounts.addUninOffer.mutate({
      username: username.value
    });
    if (!result) {
      toast.add({
        title: 'Error',
        description: 'failed',
        color: 'red',
        timeout: 5000
      });
    }
    functionResult.value = result.orgMetadata || {};
    toast.add({
      title: 'Success',
      description: 'success',
      color: 'green',
      timeout: 5000
    });
  }
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="font-display">Skiff</h1>
    <div class="flex flex-row gap-4">
      <NuxtUiInput
        v-model="username"
        label="username"
        placeholder="username" />
      <NuxtUiButton
        label="Get Account"
        @click="getAccountData()" />
    </div>
    {{ accountData }}

    <div class="flex flex-col gap-4">
      <NuxtUiButton
        label="Give @UnIn.me bonus"
        @click="giveUninBonus()" />
    </div>
    {{ functionResult }}
  </div>
</template>
