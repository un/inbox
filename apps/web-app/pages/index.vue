<script setup lang="ts">
  import { startAuthentication } from '@simplewebauthn/browser';
  import { z } from 'zod';
  import { zodSchemas } from '@u22n/utils';
  import {
    navigateTo,
    definePageMeta,
    useNuxtApp,
    useToast,
    ref,
    computed,
    watch,
    type Ref,
    onNuxtReady
  } from '#imports';

  const { $trpc } = useNuxtApp();
  definePageMeta({ guest: true });

  const passkeyLocation = ref('');
  const immediatePasskeyPrompt = ref(false);

  const showPasswordFields = ref(false);

  //Form Fields
  const usernameValid = ref<boolean | 'remote' | null>(null);
  const usernameValue = ref('');
  const usernameValidationMessage = ref('');
  const passwordInput = ref('');
  const passwordValid = ref<boolean | null>(null);
  const passwordValidationMessage = ref('');
  const twoFactorCode = ref<string[]>([]);

  const formValid = computed(() => {
    return usernameValid.value === true && passwordValid.value === true;
  });

  const disablePasswordButton = computed(() => {
    if (!showPasswordFields.value) {
      return false;
    }
    return !formValid.value;
  });

  if (process.client) {
    passkeyLocation.value = localStorage.getItem('passkeyLocation') || '';
    immediatePasskeyPrompt.value = JSON.parse(
      localStorage.getItem('immediatePasskeyPrompt') || 'false'
    );
  }

  watch(immediatePasskeyPrompt, async () => {
    const newValue = JSON.stringify(immediatePasskeyPrompt.value);
    localStorage.setItem('immediatePasskeyPrompt', newValue);
  });
  let timeoutId: NodeJS.Timeout | null = null;

  async function passwordButton() {
    if (!showPasswordFields.value) {
      showPasswordFields.value = true;
      return;
    }
    await doPasswordLogin();
  }

  async function doPasswordLogin() {
    const passwordVerification =
      await $trpc.auth.password.signInWithPassword.mutate({
        username: usernameValue.value,
        password: passwordInput.value,
        twoFactorCode:
          twoFactorCode.value.length > 0
            ? twoFactorCode.value.join('')
            : undefined
      });
    if (passwordVerification.success) {
      navigateTo('/redirect');
    }
  }

  async function doPasskeyLogin() {
    const toast = useToast();
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const passkeyOptions =
      await $trpc.auth.passkey.generatePasskeyChallenge.query({});

    if (!passkeyOptions.options) {
      toast.add({
        title: 'Server error',
        description:
          "We couldn't generate a secure login for you, please check your internet connection.",
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
      return;
    }
    try {
      const passkeyData = await startAuthentication(passkeyOptions.options);

      if (!passkeyData) {
        throw new Error('No passkey data returned');
      }

      const verifyPasskey = await $trpc.auth.passkey.verifyPasskey.mutate({
        verificationResponseRaw: passkeyData
      });
      if (verifyPasskey.success) {
        navigateTo('/redirect');
      }
    } catch (error: any) {
      toast.add({
        title: 'Passkey error',
        description:
          error.name === 'NotAllowedError'
            ? 'Passkey operation was either cancelled or timed out'
            : 'Something went wrong when getting your passkey, please try again.',
        color: error.name === 'NotAllowedError' ? 'yellow' : 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
    }
  }

  const pageReady: Ref<boolean> = ref(false);
  onNuxtReady(() => {
    pageReady.value = true;
  });
</script>

<template>
  <div class="flex h-full w-full flex-col items-center justify-between p-4">
    <div
      class="flex w-full max-w-72 grow flex-col items-center justify-center gap-8">
      <h1 class="mb-4 flex flex-col gap-1 text-center">
        <span class="text-2xl font-medium">Login to your</span>
        <span class="font-display text-5xl">UnInbox</span>
      </h1>

      <div class="flex w-full flex-col gap-4">
        <UnUiButton
          label="Login with my passkey"
          icon="i-ph-key-duotone"
          block
          size="lg"
          @click="doPasskeyLogin()" />
        <UnUiDivider label="or" />
        <div class="flex w-full flex-col gap-2">
          <div
            class="duration-800 flex w-full flex-col gap-2 overflow-hidden transition-[max-height] ease-in-out"
            :class="showPasswordFields ? 'max-h-96' : 'max-h-0'">
            <UnUiInput
              v-model:value="usernameValue"
              v-model:valid="usernameValid"
              v-model:validationMessage="usernameValidationMessage"
              width="full"
              icon="i-ph-at"
              label="Username"
              helper="Can only contain letters and numbers."
              placeholder=""
              :schema="zodSchemas.username(2)" />
            <UnUiInput
              v-model:value="passwordInput"
              v-model:valid="passwordValid"
              v-model:validationMessage="passwordValidationMessage"
              width="full"
              icon="i-ph-password"
              label="Password"
              password
              placeholder=""
              :schema="
                z.string().min(8, {
                  message: 'Password can\'t be less than 8 characters'
                })
              " />
            <div class="flex flex-col gap-2">
              <span class="text-sm">
                Enter the 6-digit code from your 2FA app
              </span>
              <Un2FAInput v-model="twoFactorCode" />
              <span class="text-sm font-medium">
                Tip: If you haven't setup 2FA yet, you can just leave this blank
              </span>
            </div>
          </div>
          <UnUiButton
            label="Login with my password"
            icon="i-ph-password"
            block
            variant="outline"
            size="lg"
            :disabled="disablePasswordButton"
            @click="passwordButton()" />
        </div>
      </div>
      <UnUiButton
        label="Not a member yet? Join instead"
        variant="soft"
        block
        size="lg"
        @click="navigateTo('/join')" />
      <!-- Not implemented yet -->
      <UnUiButton
        label="Recover my account"
        variant="ghost"
        block
        @click="navigateTo('/')" />
      <div class="h-0 max-h-0 w-full max-w-full"></div>
    </div>
  </div>
</template>
