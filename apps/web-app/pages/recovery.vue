<script setup lang="ts">
  import { z } from 'zod';
  import { zodSchemas } from '@u22n/utils';
  import {
    navigateTo,
    definePageMeta,
    useNuxtApp,
    ref,
    type Ref,
    onNuxtReady
  } from '#imports';

  const { $trpc } = useNuxtApp();
  definePageMeta({ guest: true });

  const usernameInput = ref('');
  const usernameValid = ref<boolean | 'remote' | null>(null);
  const usernameValidationMessage = ref('');
  const passwordInput = ref('');
  const passwordValid = ref<boolean | null>(null);
  const passwordValidationMessage = ref('');
  const twoFactorCode = ref<string[]>([]);
  const recoveryCodeInput = ref('');
  const recoveryCodeValid = ref<boolean | null>(null);
  const recoveryCodeValidationMessage = ref('');

  const resetWithPassword = ref<boolean>(false);
  const resetWith2FA = ref<boolean>(false);
  const recoveryLoading = ref<boolean>(false);

  async function recoverAccount() {
    recoveryLoading.value = true;
    $trpc.auth.recovery.recoverAccount
      .mutate({
        username: usernameInput.value,
        recoveryCode: recoveryCodeInput.value,
        password: resetWithPassword.value ? passwordInput.value : undefined,
        twoFactorCode: resetWith2FA.value
          ? twoFactorCode.value.join('')
          : undefined
      })
      .then(() => {
        navigateTo('/redirect');
      });
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
      <h1 class="flex flex-col gap-1 text-center">
        <span class="text-2xl font-medium">Recover your</span>
        <span class="font-display text-5xl">UnInbox</span>
      </h1>
      <div class="flex w-full flex-col gap-4">
        <span class="text-center"
          >You need to use your account recovery code as well as either your
          password or 2FA code.</span
        >

        <UnUiInput
          v-model:value="usernameInput"
          v-model:valid="usernameValid"
          v-model:validationMessage="usernameValidationMessage"
          width="full"
          icon="i-ph-at"
          label="Username"
          helper="Can only contain letters and numbers."
          placeholder=""
          :schema="zodSchemas.username(2)" />
        <UnUiButton
          label="Recovery Code + Password"
          icon="i-ph-password"
          block
          size="lg"
          :disabled="!usernameValid"
          @click="resetWithPassword = true" />
        <UnUiButton
          label="Recovery Code + 2FA Code"
          icon="i-ph-password"
          block
          size="lg"
          :disabled="!usernameValid"
          @click="resetWith2FA = true" />

        <span class="text-gray-12 text-center text-sm"
          >If you have lost your recovery code and both your password and 2FA
          device, please contact
          <a
            href="mailto:support@uninbox.com"
            target="_blank"
            class="text-base-11 underline"
            >support@uninbox.com</a
          >.
        </span>
      </div>
      <UnUiModal v-model="resetWithPassword">
        <template #header>
          <span class=""
            >Reset your Account with Recovery Code and Password</span
          >
        </template>

        <div class="flex flex-col gap-2">
          <span class="">
            This will consume and invalidate your recovery code.
          </span>
          <span class="">
            If you don't immediately reset your account credentials, you wont be
            able to log back in to your account.
          </span>
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
          <UnUiInput
            v-model:value="recoveryCodeInput"
            v-model:valid="recoveryCodeValid"
            v-model:validationMessage="recoveryCodeValidationMessage"
            width="full"
            icon="i-ph-password"
            label="Recovery Code"
            placeholder=""
            :schema="
              z
                .string()
                .min(32, {
                  message: 'Recovery Code must be 32 characters long.'
                })
                .max(32, {
                  message: 'Recovery Code must be 32 characters long.'
                })
            " />
        </div>

        <template #footer>
          <div class="flex w-full justify-end">
            <UnUiButton
              label="Recover your account"
              color="red"
              :disabled="!passwordValid || !recoveryCodeValid"
              :loading="recoveryLoading"
              @click="
                recoverAccount().then(() => {
                  recoveryLoading = false;
                })
              " />
          </div>
        </template>
      </UnUiModal>

      <UnUiModal v-model="resetWith2FA">
        <template #header>
          <span>Reset your Account with Recovery Code and 2FA Code</span>
        </template>

        <div class="flex flex-col gap-2">
          <span class="">
            This will consume and invalidate your recovery code.
          </span>
          <span class="">
            If you don't immediately reset your account credentials, you wont be
            able to log back in to your account.
          </span>
          <span class="-mb-2 text-sm font-medium"> Enter the 2FA code </span>
          <div class="w-fit">
            <Un2FAInput v-model="twoFactorCode" />
          </div>
          <UnUiInput
            v-model:value="recoveryCodeInput"
            v-model:valid="recoveryCodeValid"
            v-model:validationMessage="recoveryCodeValidationMessage"
            width="full"
            icon="i-ph-password"
            label="Recovery Code"
            placeholder=""
            :schema="
              z
                .string()
                .min(32, {
                  message: 'Recovery Code must be 32 characters long.'
                })
                .max(32, {
                  message: 'Recovery Code must be 32 characters long.'
                })
            " />
        </div>

        <template #footer>
          <div class="flex w-full justify-end">
            <UnUiButton
              label="Recover your account"
              color="red"
              :disabled="twoFactorCode.length !== 6 || !recoveryCodeValid"
              :loading="recoveryLoading"
              @click="
                recoverAccount().then(() => {
                  recoveryLoading = false;
                })
              " />
          </div>
        </template>
      </UnUiModal>
    </div>
  </div>
</template>
