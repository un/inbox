<script setup lang="ts">
  import { startAuthentication } from '@simplewebauthn/browser';
  import { z } from 'zod';
  import { zodSchemas } from '@u22n/utils';
  import {
    navigateTo,
    definePageMeta,
    useRuntimeConfig,
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
  const turnstileToken = ref();
  const errorMessage = ref(false);
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
  const twoFactorCode = ref('');

  const formValid = computed(() => {
    return (
      usernameValid.value === true &&
      passwordValid.value === true &&
      twoFactorCode.value.length === 6
    );
  });

  const disablePasswordButton = computed(() => {
    if (!showPasswordFields.value) {
      return false;
    }
    return !formValid.value;
  });

  const turnstileEnabled = useRuntimeConfig().public.turnstileEnabled;
  if (!turnstileEnabled) {
    turnstileToken.value = '';
  }

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
        turnstileToken: turnstileToken.value,
        username: usernameValue.value,
        password: passwordInput.value,
        twoFactorCode: twoFactorCode.value
      });
    if (passwordVerification.success) {
      navigateTo('/redirect');
    }
  }

  async function doPasskeyLogin() {
    if (turnstileEnabled && !turnstileToken.value) {
      errorMessage.value = true;

      await new Promise((resolve) => {
        const unwatch = watch(turnstileToken, (newValue) => {
          if (newValue !== null) {
            resolve(newValue);
            unwatch();
            errorMessage.value = false;
          }
        });
      });
    }
    const toast = useToast();
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const passkeyOptions =
      await $trpc.auth.passkey.generatePasskeyChallenge.query({
        turnstileToken: turnstileToken.value
      });

    if (turnstileEnabled) {
      turnstileToken.value?.reset?.();
    }

    if (!passkeyOptions.options) {
      toast.add({
        title: 'Server error',
        description:
          'We couldnt generate a secure login for you, please check your internet connection.',
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
        turnstileToken: turnstileToken.value,
        verificationResponseRaw: passkeyData
      });
      if (verifyPasskey.success) {
        navigateTo('/redirect');
      }
    } catch (e) {
      toast.add({
        title: 'Passkey error',
        description:
          'Something went wrong when getting your passkey, please try again.',
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
    }
  }

  const pageReady: Ref<boolean> = ref(false);
  onNuxtReady(() => {
    pageReady.value = true;
  });

  const showBetaModal = ref(false);
</script>

<template>
  <div
    class="flex h-screen w-screen flex-col items-center justify-between p-4 pb-14">
    <UnUiModal v-model="showBetaModal">
      <template #header>
        <span class="">Beta Software</span>
      </template>
      <div class="flex w-full flex-col gap-4">
        <p>UnInbox is still in early access beta</p>
        <p>
          This means there'll be a few bugs and issues, and the design may have
          some inconsistencies or weaknesses
        </p>
        <p>
          Please help us build a better email by reporting any issues you find
          and provide feedback to help us improve the product
        </p>

        <div class="mt-4 flex w-full flex-row justify-center gap-4">
          <UnUiButton
            label="I'll come back later"
            size="lg"
            variant="outline"
            icon="i-ph-x"
            @click="showBetaModal = false" />
          <UnUiButton
            label="I understand, let me in!"
            size="lg"
            color="green"
            icon="i-ph-check"
            @click="navigateTo('/join')" />
        </div>
      </div>
    </UnUiModal>
    <div
      class="flex w-full max-w-72 grow flex-col items-center justify-center gap-8">
      <h1 class="mb-4 flex flex-col gap-1 text-center">
        <span class="text-2xl font-medium">Login to your</span>
        <span class="font-display text-5xl">UnInbox</span>
        <div>
          <NuxtUiBadge
            label="Beta"
            size="md"
            color="amber" />
        </div>
      </h1>

      <div class="flex w-full flex-col gap-4">
        <UnUiButton
          label="Login with my passkey"
          icon="i-ph-key-duotone"
          block
          size="lg"
          @click="doPasskeyLogin()" />
        <UnUiDivider label="or" />
        <div class="-mt-2 flex w-full flex-col gap-2">
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
              :schema="zodSchemas.username()" />
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
              <span class="text-sm"
                >Enter the 6-digit code from your 2FA app</span
              >
              <Un2FAInput v-model="twoFactorCode" />
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
        @click="showBetaModal = true" />
      <!-- Not implemented yet -->
      <UnUiButton
        label="Recover my account"
        variant="ghost"
        block
        @click="navigateTo('/')" />
      <div class="h-0 max-h-0 w-full max-w-full">
        <UnUiAlert
          v-show="errorMessage"
          icon="i-ph-warning-circle"
          title="Waiting for automatic captcha!"
          description="This is an automated process and should complete within a few seconds. If it doesn't, please refresh the page."
          color="orange"
          variant="solid" />
      </div>
    </div>
    <div v-if="pageReady && turnstileEnabled">
      <!-- This should be invisible, we will be using invisible challenges -->
      <NuxtTurnstile
        v-model="turnstileToken"
        class="hidden" />
    </div>
  </div>
</template>
