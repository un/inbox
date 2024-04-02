<script setup lang="ts">
  import { z } from 'zod';
  import { useFileDialog } from '@vueuse/core';
  import {
    useRuntimeConfig,
    useNuxtApp,
    useToast,
    ref,
    refreshNuxtData,
    useRoute,
    watch,
    computed
  } from '#imports';
  import {
    startAuthentication,
    startRegistration
  } from '@simplewebauthn/browser';
  import type {
    AuthenticationResponseJSON,
    RegistrationResponseJSON
  } from '@simplewebauthn/types';
  import type { SettingsSecurityPasswordReset } from '#build/components';
  const { $trpc } = useNuxtApp();
  const toast = useToast();
  const verificationToken = ref<string | null>(null);
  const verificationModalOpen = ref(false);
  let timeoutId: NodeJS.Timeout | null = null;

  const {
    data,
    status,
    refresh: refreshSecurityData
  } = $trpc.account.security.getSecurityOverview.useQuery({});
  watch(status, (newStatus) => {
    if (newStatus === 'success') {
      passwordEnabled.value = data.value?.passwordSet ?? false;
      recoveryCodeSet.value = data.value?.recoveryCodeSet ?? false;
      twoFactorEnabled.value = data.value?.twoFactorEnabled ?? false;
    }
  });

  const hasPassword = computed(() => {
    return data.value?.passwordSet ?? false;
  });

  const hasPasskeys = computed(() => {
    return data.value?.passkeys.length ?? 0;
  });

  const passwordEnabled = ref(false);
  const recoveryCodeSet = ref(false);
  const twoFactorEnabled = ref(false);

  const canDisablePassword = computed(() => {
    if ((data.value?.passkeys.length ?? 0) > 0) {
      return true;
    }
    return false;
  });

  const canDeletePasskeys = computed(() => {
    if (
      data.value?.passkeys.length === 0 ||
      (data.value?.passkeys.length === 1 && !hasPassword.value)
    ) {
      return false;
    }
    return true;
  });

  const verificationPasswordInput = ref<string | undefined>(undefined);
  const verificationPasswordValid = ref(false);
  const verificationPasswordValidationMessage = ref('');
  const passkeyVerificationData = ref<AuthenticationResponseJSON | null>(null);

  async function getVerificationToken(): Promise<void> {
    if (!verificationPasswordInput.value && !passkeyVerificationData.value) {
      return;
    }
    const { data: verificationData } =
      await $trpc.account.security.getVerificationToken.useQuery({
        password: verificationPasswordInput.value,
        verificationResponseRaw: passkeyVerificationData.value || undefined
      });
    if (verificationData.value) {
      verificationToken.value = verificationData.value.token;
      verificationModalOpen.value = false;
    }
  }

  async function getPasskeyChallenge(): Promise<void> {
    console.log('🔥 get passkey');

    const { data: passkeyData } =
      await $trpc.account.security.generatePasskeyVerificationChallenge.useQuery(
        {}
      );
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (!passkeyData?.value?.options) {
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
      const passkeyDataAuthentication = await startAuthentication(
        passkeyData.value.options
      );
      if (!passkeyDataAuthentication) {
        throw new Error('No passkey data returned');
      }

      await getVerificationToken();
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

  async function doAction() {
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
  }

  // watch(passwordEnabled, (newValue) => {
  //   if (newValue === false) {
  //     disablePassword({ confirm: false });
  //   }
  //   if (newValue === true) {
  //     resetPassword({ confirm: false });
  //   }
  // });

  const showDisablePasswordModal = ref(false);
  async function disablePassword({ confirm }: { confirm?: boolean }) {
    if (!passwordEnabled.value || !canDisablePassword.value) {
      return;
    }
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    if (!confirm) {
      showDisablePasswordModal.value = true;
    }
    if (confirm) {
      const result = await $trpc.account.security.disablePassword.mutate({
        verificationToken: verificationToken.value
      });
      if (result.success) {
        toast.add({
          title: 'Password Disabled',
          description: 'You will no longer be able to sign in with passwords.',
          color: 'green',
          timeout: 5000,
          icon: 'i-ph-check-circle'
        });
        showDisablePasswordModal.value = false;
      } else {
        toast.add({
          title: 'Password Error',
          description: 'Something went wrong when disabling your password.',
          color: 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
      }
    }
  }

  const showResetPasswordModal = ref(false);
  async function resetPassword({ confirm }: { confirm?: boolean }) {
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    showResetPasswordModal.value = true;
  }

  const showDisable2FAModal = ref(false);
  const showReset2FAModal = ref(false);
  async function disable2FA({ confirm }: { confirm?: boolean }) {
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    if (!confirm) {
      //open password disable modal
    }
    if (confirm) {
      //disable password
      //if user has passkeys, dont do anything else
      // if user dosnt have passkeys, prompt for new 2FA
    }
  }
  const passkeyNewButtonLoading = ref(false);
  async function addPasskey({ confirm }: { confirm?: boolean }) {
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    passkeyNewButtonLoading.value = true;
    const { options } =
      await $trpc.account.security.generateNewPasskeyChallenge.query({
        verificationToken: verificationToken.value
      });
    // start registration

    let newPasskeyData: RegistrationResponseJSON;
    try {
      newPasskeyData = await startRegistration(options);
    } catch (error) {
      toast.add({
        id: 'passkey_error',
        title: 'Passkey error',
        description:
          'Something went wrong when creating your passkey, please try again or switch to password mode.',
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
      passkeyNewButtonLoading.value = false;
      return;
    }
    const setNewPasskey = await $trpc.account.security.addNewPasskey.mutate({
      verificationToken: verificationToken.value,
      registrationResponseRaw: newPasskeyData,
      nickname: 'Primary'
    });
    if (!setNewPasskey.success) {
      toast.add({
        id: 'passkey_error',
        title: 'Passkey error',
        description:
          'Something went while adding your new passkey, please try again.',
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
      passkeyNewButtonLoading.value = true;
      return;
    }
    refreshSecurityData();
    toast.add({
      title: 'Passkey Created',
      description: 'You can now login with new passkey.',
      color: 'green',
      timeout: 5000,
      icon: 'i-ph-check-circle'
    });
  }
  async function removePasskey({ confirm }: { confirm?: boolean }) {
    if (!passwordEnabled.value || !canDisablePassword.value) {
      return;
    }
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    if (!confirm) {
      //open password disable modal
    }
    if (confirm) {
      //disable password
    }
  }
  async function deleteSession({ confirm }: { confirm?: boolean }) {
    if (!passwordEnabled.value || !canDisablePassword.value) {
      return;
    }
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    if (!confirm) {
      //open password disable modal
    }
    if (confirm) {
      //disable password
    }
  }
  async function deleteAllSessions({ confirm }: { confirm?: boolean }) {
    if (!passwordEnabled.value || !canDisablePassword.value) {
      return;
    }
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    if (!confirm) {
      //open password disable modal
    }
    if (confirm) {
      //disable password
    }
  }
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <span class="font-display text-2xl">Your Account Security</span>
    </div>
    <div
      v-if="status !== 'success'"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-8">
      <UnUiIcon
        name="i-svg-spinners-3-dots-fade"
        size="24" />
      <span>Loading your profiles</span>
    </div>
    <div
      v-if="status === 'success'"
      class="flex w-full flex-col items-start justify-center gap-8 pb-14">
      <div class="flex flex-col gap-4">
        <span class="text-lg font-medium">Legacy Security</span>
        <div class="grid grid-cols-2 items-center justify-between gap-12">
          <span class="text-base">Password Enabled</span>
          <div class="flex flex-row items-center gap-4">
            <UnUiTooltip
              v-if="!canDisablePassword"
              text="Enable your passkeys to disable your password">
              <UnUiToggle
                v-model="passwordEnabled"
                disabled
                label="Disable Password" />
            </UnUiTooltip>
            <UnUiToggle
              v-if="canDisablePassword"
              v-model="passwordEnabled"
              label="Disable Password" />
            <UnUiButton
              :label="passwordEnabled ? 'Reset Password' : 'Set Password'"
              size="xs"
              @click="resetPassword({})" />
          </div>
        </div>
        <div class="grid grid-cols-2 items-center justify-between gap-12">
          <span class="text-base">Two Factor Authentication</span>
          <div class="flex flex-row items-center gap-4">
            <UnUiTooltip
              v-if="!canDisablePassword"
              text="Enable your passkeys to disable your password">
              <UnUiToggle
                v-model="passwordEnabled"
                disabled
                label="Disable Password" />
            </UnUiTooltip>
            <UnUiToggle
              v-if="canDisablePassword"
              v-model="twoFactorEnabled"
              label="Disable Password" />
            <UnUiButton
              label="Reset 2FA"
              size="xs"
              @click="resetPassword({})" />
          </div>
        </div>
        <div class="grid grid-cols-2 items-center justify-between gap-12">
          <span class="text-base">Recovery Code</span>
          <div class="flex flex-row items-center gap-4">
            <UnUiTooltip text="Disable Password & 2FA first">
              <UnUiToggle
                disabled
                label="Disable Recovery" />
            </UnUiTooltip>
            <UnUiTooltip text="Disable Password & 2FA first">
              <UnUiButton
                label="Reset Recovery Code"
                disabled
                size="xs"
                @click="resetPassword({})" />
            </UnUiTooltip>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <span class="text-lg font-medium">Passkeys</span>
        <div class="flex w-full flex-row items-center justify-between gap-4">
          <template
            v-for="passkey of data?.passkeys"
            :key="passkey.publicId">
            <div
              class="bg-base-3 flex cursor-pointer flex-row items-center gap-4 rounded-xl px-8 py-4 shadow-xl">
              <div class="flex flex-col gap-0">
                <span class="text-sm font-medium">
                  {{ passkey.nickname }}
                </span>

                <span class="text-xs">
                  Created: {{ passkey.createdAt.toLocaleDateString() }}
                </span>
              </div>
              <UnUiButton
                size="sm"
                square
                color="red"
                icon="i-ph-trash"
                class="h-full" />
            </div>
          </template>
          <UnUiButton
            label="Add Passkey"
            size="xl"
            color="green"
            icon="i-ph-plus"
            @click="addPasskey({})" />
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <span class="text-lg font-medium">Sessions</span>
        <div class="flex w-full flex-row items-center justify-between gap-4">
          <template
            v-for="session of data?.sessions"
            :key="session.publicId">
            <div
              class="bg-base-3 flex cursor-pointer flex-row items-center gap-4 rounded-xl px-8 py-4 shadow-xl">
              <div class="flex flex-col gap-0">
                <span class="text-sm font-medium">
                  {{ session.device }} - {{ session.os }}
                </span>

                <span class="text-xs">
                  First login: {{ session.createdAt.toLocaleDateString() }}
                </span>
              </div>
              <UnUiButton
                size="sm"
                square
                color="red"
                icon="i-ph-trash"
                class="h-full" />
            </div>
          </template>
          <UnUiButton
            size="xl"
            color="red"
            icon="i-ph-trash"
            trailing
            label="Log out of all devices" />
        </div>
      </div>
      {{ data }}
      <UnUiModal v-model="verificationModalOpen">
        <template #header>
          <div class="flex flex-row items-center gap-2">
            <span class="text-red-9 text-2xl leading-none">
              <UnUiIcon
                name="i-ph-warning-octagon"
                size="xl" />
            </span>
            <span class="text-lg font-semibold leading-none">
              Security Check!
            </span>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <span class="">
            Before you can change any security settings, you need to verify you
            are authorized.
          </span>
          <div
            v-if="hasPassword"
            class="flex flex-col gap-4">
            <UnUiInput
              v-model:value="verificationPasswordInput"
              v-model:valid="verificationPasswordValid"
              v-model:validationMessage="verificationPasswordValidationMessage"
              icon="i-ph-password"
              label="Password"
              password
              placeholder=""
              :schema="z.string().min(8)" />
            <div>
              <UnUiButton
                label="Verify with your password"
                @click="getVerificationToken()" />
            </div>
          </div>
          <UnUiDivider
            v-if="hasPassword && hasPasskeys"
            label="or" />
          <div v-if="hasPasskeys">
            <UnUiButton
              label="Verify with your passkey"
              @click="getPasskeyChallenge()" />
          </div>
        </div>
        <template #footer>
          <div class="flex flex-row justify-end gap-2">
            <UnUiButton
              label="Cancel"
              variant="outline"
              @click="verificationModalOpen = false" />
          </div>
        </template>
      </UnUiModal>

      <UnUiModal v-model="showDisablePasswordModal">
        <template #header>
          <div class="flex flex-row items-center gap-2">
            <span class="text-red-9 text-2xl leading-none">
              <UnUiIcon
                name="i-ph-warning-octagon"
                size="xl" />
            </span>
            <span class="text-lg font-semibold leading-none">
              Disable Password
            </span>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <span class="">
            If you disable your password, we'll also remove 2FA from your
            account.
          </span>
          <span class="">
            The only way you'll be able to access your account is by using a
            passkey.
          </span>
          <span class="">
            Are you sure you want to disable your password?
          </span>
          <div>
            <UnUiButton
              label="Disable Password"
              color="red"
              @click="disablePassword({ confirm: true })" />
          </div>
        </div>
      </UnUiModal>

      <UnUiModal v-model="showResetPasswordModal">
        <template #header>
          <div class="flex flex-row items-center gap-2">
            <span class="text-red-9 text-2xl leading-none">
              <UnUiIcon
                name="i-ph-warning-octagon"
                size="xl" />
            </span>
            <span class="text-lg font-semibold leading-none">
              Set your password
            </span>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <SettingsSecurityPasswordReset
            :verification-token="verificationToken!"
            @close="showResetPasswordModal = false" />
        </div>
      </UnUiModal>
      <!--       
      <UnUiModal v-model="showReset2FAModal">
        <template #header>
          <span class="">Are you sure you want to reset 2FA?</span>
        </template>

        <div class="flex flex-col gap-2">
          <span class="">
            This will temporarily disable two factor authentication on your
            account.
          </span>
          <span class="">
            If you don't immediately re-configure two factor authentication, you
            wont be able to log back in to your account.
          </span>
          <span class=""> Are you sure you want to do this? </span>
        </div>

        <template #footer>
          <div class="flex flex-row gap-2">
            <UnUiButton
              label="Disable 2FA"
              color="red"
              @click="reset2FA()" />
            <UnUiButton
              label="Cancel"
              variant="outline"
              @click="showReset2FAModal = false" />
          </div>
        </template>
      </UnUiModal> -->
    </div>
  </div>
</template>
