<script setup lang="ts">
  // Seriously, why the fu*k i need to do this
  declare const window: {
    confirm: (message: string) => boolean;
  };

  import { ref, useNuxtApp, useToast } from '#imports';
  import { serialize } from 'superjson';
  import { toDataURL } from 'qrcode';
  const { $trpc } = await useNuxtApp();

  const username = ref<string>('');

  const functionResult = ref({});
  const toast = useToast();

  const accountData = ref<{} | null>(null);
  const qrCode = ref<string>('');

  async function getAccountData() {
    const { data } = await $trpc.accounts.getFullAccountData.useQuery({
      username: username.value
    });
    accountData.value = data.value || {};
  }

  async function resetPassword() {
    if (!accountData.value) return;
    const sure = window.confirm(
      `You are about to reset the password for ${username.value}. Are you sure?`
    );
    if (!sure) return;
    const result = await $trpc.accounts.resetPassword.mutate({
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
    functionResult.value = result;
    toast.add({
      title: 'Success',
      description: 'success',
      color: 'green',
      timeout: 5000
    });
  }
  async function reset2FA() {
    if (!accountData.value) return;
    const sure = window.confirm(
      `You are about to reset the 2FA for ${username.value}. Are you sure?`
    );
    if (!sure) return;
    const result = await $trpc.accounts.reset2fa.mutate({
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
    functionResult.value = result;
    qrCode.value = await toDataURL(result.uri);
    toast.add({
      title: 'Success',
      description: 'success',
      color: 'green',
      timeout: 5000
    });
  }
</script>

<template>
  <div class="flex flex-col gap-8 py-4">
    <h1 class="font-display">Password Reset</h1>
    <div class="flex flex-row gap-4">
      <NuxtUiInput
        v-model="username"
        label="username"
        placeholder="username" />
      <NuxtUiButton
        label="Get Account"
        @click="getAccountData()" />
    </div>
    <pre>
      {{ serialize(accountData).json }}
    </pre>
    <div class="flex w-fit gap-2">
      <NuxtUiButton
        label="Reset Password"
        :disabled="!accountData"
        @click="resetPassword()" />
      <NuxtUiButton
        label="Reset 2FA"
        :disabled="!accountData"
        @click="reset2FA()" />
    </div>
    <pre>
      {{ serialize(functionResult).json }}
    </pre>
    <div v-if="qrCode">
      <img :src="qrCode" />
    </div>
  </div>
</template>
