<script setup lang="ts">
  import { z } from 'zod';

  import { useNuxtApp, useToast, ref, watch, computed } from '#imports';
  import {
    startAuthentication,
    startRegistration
  } from '@simplewebauthn/browser';
  import type {
    AuthenticationResponseJSON,
    RegistrationResponseJSON
  } from '@simplewebauthn/types';
  import type { SettingsSecurityPasswordReset } from '#build/components';
  import type { TypeId } from '@u22n/utils';
  import { navigateTo } from '#app';
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
  const twoFactorEnabled = ref(false);
  const recoveryCodeSet = ref(false);

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

  //* Verification Code Functions
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
      passkeyVerificationData.value = passkeyDataAuthentication;
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

  //* Actual security functions
  const showDisablePasswordModal = ref(false);
  async function disablePassword({ confirm }: { confirm?: boolean }) {
    if (passwordEnabled.value == false && !canDisablePassword.value) {
      passwordEnabled.value = true;
      return;
    }
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      setTimeout(() => {
        passwordEnabled.value = !passwordEnabled.value;
      }, 500);
      return;
    }
    if (!confirm) {
      showDisablePasswordModal.value = true;
    }
    if (confirm) {
      if (!passwordEnabled.value) {
        const result = await $trpc.account.security.disablePassword.mutate({
          verificationToken: verificationToken.value
        });
        if (result.success) {
          toast.add({
            title: 'Password Disabled',
            description:
              'You will no longer be able to sign in with passwords.',
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
      if (passwordEnabled.value) {
        resetPassword();
      }
    }
  }

  const showResetPasswordModal = ref(false);
  async function resetPassword() {
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    showResetPasswordModal.value = true;
  }

  // 2FA
  const showDisable2FAModal = ref(false);
  const disable2FALoading = ref(false);
  const showReset2FAModal = ref(false);
  const twoFactorDisableCode = ref('');
  async function disable2FA({ confirm }: { confirm?: boolean }) {
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      setTimeout(() => {
        twoFactorEnabled.value = !twoFactorEnabled.value;
      }, 500);
      return;
    }
    if (confirm) {
      if (!twoFactorEnabled.value) {
        disable2FALoading.value = true;
        const reset2FAMutation =
          $trpc.account.security.disable2FA.useMutation();
        await reset2FAMutation.mutate({
          verificationToken: verificationToken.value,
          twoFactorCode: twoFactorDisableCode.value
        });
        if (reset2FAMutation.error.value) {
          toast.add({
            id: '2fa_disabled',
            title: 'Failed to disable Two Factor Authentication (2FA)',
            description: `Something went wrong. Check the errors`,
            icon: 'i-ph-warning-octagon',
            color: 'red',
            timeout: 5000
          });

          disable2FALoading.value = false;
          return;
        }
        toast.add({
          id: '2fa_disabled',
          title: 'Two Factor Authentication (2FA) has been disabled',
          description: `Please reconfigure your Two Factor Authentication (2FA) immediately.`,
          icon: 'i-ph-warning-octagon',
          color: 'orange',
          timeout: 5000
        });
        showDisable2FAModal.value = false;
        disable2FALoading.value = false;
        twoFactorEnabled.value = false;
        return;
      }
      if (twoFactorEnabled.value) {
        reset2FA();
        return;
      }
    }
    if (!confirm) {
      showDisable2FAModal.value = true;
    }
  }

  async function reset2FA() {
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    showReset2FAModal.value = true;
  }

  // Passkeys
  const passkeyNewButtonLoading = ref(false);
  async function addPasskey() {
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
      nickname: 'Passkey'
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
  const showConfirmPasskeyDeleteModal = ref(false);
  const passkeyPublicIdToDelete = ref<TypeId<'accountPasskey'> | null>(null);
  async function deletePasskey({
    confirm,
    passkeyPublicId
  }: {
    confirm?: boolean;
    passkeyPublicId: TypeId<'accountPasskey'>;
  }) {
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    if (!canDeletePasskeys.value) {
      toast.add({
        id: 'passkey_error',
        title: 'Passkey error',
        description:
          'You need to have at least 1 passkey, or password login enabled.',
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
      return;
    }
    if (!confirm) {
      passkeyPublicIdToDelete.value = passkeyPublicId;
      showConfirmPasskeyDeleteModal.value = true;
    }
    if (confirm) {
      const result = await $trpc.account.security.deletePasskey.mutate({
        verificationToken: verificationToken.value,
        passkeyPublicId: passkeyPublicId
      });
      if (!result.success) {
        toast.add({
          id: 'passkey_error',
          title: 'Passkey error',
          description: 'Couldnt delete the passkey, please try again.',
          color: 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
        showConfirmPasskeyDeleteModal.value = false;
        return;
      }
      refreshSecurityData();
      toast.add({
        title: 'Passkey Deleted',
        description: 'Deleted successfully.',
        color: 'green',
        timeout: 5000,
        icon: 'i-ph-check-circle'
      });
      showConfirmPasskeyDeleteModal.value = false;
    }
  }

  // Sessions
  const showConfirmSessionDeleteModal = ref(false);
  const sessionPublicIdToDelete = ref<TypeId<'accountSession'> | null>(null);
  async function deleteSession({
    confirm,
    sessionPublicId
  }: {
    confirm?: boolean;
    sessionPublicId: TypeId<'accountSession'>;
  }) {
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    if (!confirm) {
      sessionPublicIdToDelete.value = sessionPublicId;
      showConfirmSessionDeleteModal.value = true;
    }
    if (confirm) {
      const result = await $trpc.account.security.deleteSession.mutate({
        verificationToken: verificationToken.value,
        sessionPublicId: sessionPublicId
      });
      if (!result.success) {
        toast.add({
          id: 'session_error',
          title: 'Session error',
          description: 'Couldnt delete the session, please try again.',
          color: 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
        showConfirmSessionDeleteModal.value = false;
        return;
      }
      refreshSecurityData();
      toast.add({
        title: 'Session Deleted',
        description: 'Deleted successfully.',
        color: 'green',
        timeout: 5000,
        icon: 'i-ph-check-circle'
      });
      showConfirmSessionDeleteModal.value = false;
    }
  }
  const showConfirmSessionDeleteAllModal = ref(false);
  async function deleteAllSessions({ confirm }: { confirm?: boolean }) {
    if (!verificationToken.value) {
      verificationModalOpen.value = true;
      return;
    }
    if (!confirm) {
      showConfirmSessionDeleteAllModal.value = true;
    }
    if (confirm) {
      const result = await $trpc.account.security.deleteAllSessions.mutate({
        verificationToken: verificationToken.value
      });
      if (!result.success) {
        toast.add({
          id: 'session_error',
          title: 'Session error',
          description: 'Couldnt delete the sessions, please try again.',
          color: 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
        showConfirmSessionDeleteAllModal.value = false;
        return;
      }
      refreshSecurityData();
      toast.add({
        title: 'Sessions Deleted',
        description: 'Deleted successfully.',
        color: 'green',
        timeout: 5000,
        icon: 'i-ph-check-circle'
      });
      await navigateTo('/');
      showConfirmSessionDeleteAllModal.value = false;
    }
  }
</script>

<template>
  <div
    class="flex h-full w-full flex-col items-start gap-8 overflow-y-auto p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <span class="font-display text-2xl">Your Account Security</span>
    </div>
    <div
      v-if="status !== 'success'"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-8">
      <UnUiIcon
        name="i-svg-spinners-90-ring"
        size="24" />
      <span>Loading your profiles</span>
    </div>
    <div
      v-if="status === 'success'"
      class="flex w-full flex-col items-start justify-center gap-8 pb-14">
      <div class="flex flex-col gap-4">
        <span class="text-lg font-medium">Legacy Security</span>
        <div
          class="grid grid-rows-2 items-center justify-between gap-4 lg:grid-cols-2 lg:gap-12">
          <span class="text-base">Password Enabled</span>
          <div class="flex flex-row items-center gap-4">
            <UnUiTooltip
              v-if="!canDisablePassword"
              text="Enable your passkeys to disable your password">
              <UnUiToggle
                v-model="passwordEnabled"
                disabled
                label="Disable Password"
                @click="disablePassword({})" />
            </UnUiTooltip>
            <UnUiToggle
              v-if="canDisablePassword"
              v-model="passwordEnabled"
              label="Disable Password"
              @click="disablePassword({})" />
            <UnUiButton
              :label="passwordEnabled ? 'Reset Password' : 'Set Password'"
              size="xs"
              @click="resetPassword()" />
          </div>
        </div>
        <div
          class="grid grid-rows-2 items-center justify-between gap-4 lg:grid-cols-2 lg:gap-12">
          <span class="text-base">Two Factor Authentication</span>
          <div class="flex flex-row items-center gap-4">
            <UnUiTooltip
              v-if="!canDisablePassword"
              text="Enable your passkeys to disable your 2FA">
              <UnUiToggle
                v-model="twoFactorEnabled"
                disabled
                label="Disable 2FA" />
            </UnUiTooltip>
            <UnUiTooltip
              v-if="passwordEnabled && canDisablePassword"
              text="Disable password to disable 2FA">
              <UnUiToggle
                v-if="canDisablePassword"
                v-model="twoFactorEnabled"
                :disabled="passwordEnabled"
                label="Disable 2FA" />
            </UnUiTooltip>

            <UnUiToggle
              v-if="!passwordEnabled"
              v-model="twoFactorEnabled"
              :disabled="passwordEnabled"
              label="Disable 2FA"
              @click="disable2FA({})" />

            <UnUiButton
              label="Reset 2FA"
              size="xs"
              @click="reset2FA()" />
          </div>
        </div>
        <div
          class="grid grid-rows-2 items-center justify-between gap-4 lg:grid-cols-2 lg:gap-12">
          <span class="text-base">Recovery Code</span>
          <div class="flex flex-row items-center gap-4">
            <UnUiTooltip text="Disable Password & 2FA first">
              <UnUiToggle
                v-model="recoveryCodeSet"
                disabled
                label="Disable Recovery" />
            </UnUiTooltip>
            <UnUiTooltip text="Disable Password & 2FA first">
              <UnUiButton
                label="Reset Recovery Code"
                disabled
                size="xs" />
            </UnUiTooltip>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <span class="text-lg font-medium">Passkeys</span>
        <div
          class="flex w-full flex-col items-center justify-between gap-4 lg:flex-row">
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
                  <UnUiTooltip :text="passkey.createdAt.toString()">
                    Created: {{ passkey.createdAt.toLocaleDateString() }}
                  </UnUiTooltip>
                </span>
              </div>
              <UnUiButton
                size="sm"
                square
                color="red"
                icon="i-ph-trash"
                class="h-full"
                @click="
                  deletePasskey({
                    confirm: false,
                    passkeyPublicId: passkey.publicId
                  })
                " />
            </div>
          </template>
          <UnUiButton
            label="Add Passkey"
            size="xl"
            color="green"
            icon="i-ph-plus"
            @click="addPasskey()" />
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <span class="text-lg font-medium">Sessions</span>
        <div
          class="flex w-full flex-col items-center justify-between gap-4 lg:flex-row">
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
                class="h-full"
                @click="
                  deleteSession({
                    confirm: false,
                    sessionPublicId: session.publicId
                  })
                " />
            </div>
          </template>
          <UnUiButton
            size="xl"
            color="red"
            icon="i-ph-trash"
            trailing
            label="Log out of all devices"
            @click="deleteAllSessions({ confirm: false })" />
        </div>
      </div>
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
            @complete="passwordEnabled = true"
            @close="showResetPasswordModal = false" />
        </div>
      </UnUiModal>
      <UnUiModal v-model="showDisable2FAModal">
        <template #header>
          <span class="">Are you sure you want to disable 2FA?</span>
        </template>
        <span class="">
          This will disable two factor authentication on your account.
        </span>
        <span>
          To reset 2FA on this account, you need to use your current 2FA
          calculator.
        </span>
        <span>
          If you lost access to your 2FA calculator, please log out and back in
          with your recovery code.
        </span>
        <Un2FAInput
          v-model="twoFactorDisableCode"
          class="" />

        <template #footer>
          <div class="flex flex-row gap-2">
            <UnUiButton
              label="Disable 2FA"
              color="red"
              :loading="disable2FALoading"
              :disabled="disable2FALoading"
              @click="disable2FA({ confirm: true })" />
            <UnUiButton
              label="Cancel"
              variant="outline"
              @click="showDisable2FAModal = false" />
          </div>
        </template>
      </UnUiModal>

      <UnUiModal
        v-model="showReset2FAModal"
        fullscreen>
        <template #header>
          <div class="flex flex-row items-center gap-2">
            <span class="text-red-9 text-2xl leading-none">
              <UnUiIcon
                name="i-ph-warning-octagon"
                size="xl" />
            </span>
            <span class="text-lg font-semibold leading-none"> Reset 2FA </span>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <SettingsSecurityTotpReset
            :verification-token="verificationToken!"
            @complete="twoFactorEnabled = true"
            @close="showReset2FAModal = false" />
        </div>
      </UnUiModal>

      <UnUiModal v-model="showConfirmPasskeyDeleteModal">
        <template #header>
          <span class="">Confirm</span>
        </template>
        <span class="">Are you sure you want to delete this Passkey?</span>
        <template #footer>
          <div class="flex flex-row gap-2">
            <UnUiButton
              label="Yes, delete it"
              color="red"
              @click="
                deletePasskey({
                  confirm: true,
                  passkeyPublicId: passkeyPublicIdToDelete!
                })
              " />
            <UnUiButton
              label="Cancel"
              variant="outline"
              @click="showConfirmPasskeyDeleteModal = false" />
          </div>
        </template>
      </UnUiModal>

      <UnUiModal v-model="showConfirmSessionDeleteModal">
        <template #header>
          <span class="">Confirm</span>
        </template>
        <div class="flex flex-col gap-2">
          <span class="">Are you sure you want to delete this Session?</span>
          <span class="">
            If this is for the currently logged in device, you'll need to log
            back in again!
          </span>
        </div>
        <template #footer>
          <div class="flex flex-row gap-2">
            <UnUiButton
              label="Yes, delete it"
              color="red"
              @click="
                deleteSession({
                  confirm: true,
                  sessionPublicId: sessionPublicIdToDelete!
                })
              " />
            <UnUiButton
              label="Cancel"
              variant="outline"
              @click="showConfirmSessionDeleteModal = false" />
          </div>
        </template>
      </UnUiModal>

      <UnUiModal v-model="showConfirmSessionDeleteAllModal">
        <template #header>
          <span class="">Confirm</span>
        </template>
        <div class="flex flex-col gap-2">
          <span class="">
            Are you sure you want to delete all sessions for your account?
          </span>
          <span class="">You'll need to log back in on all devices!</span>
        </div>
        <template #footer>
          <div class="flex flex-row gap-2">
            <UnUiButton
              label="Yes, delete it"
              color="red"
              @click="
                deleteAllSessions({
                  confirm: true
                })
              " />
            <UnUiButton
              label="Cancel"
              variant="outline"
              @click="showConfirmSessionDeleteAllModal = false" />
          </div>
        </template>
      </UnUiModal>
    </div>
  </div>
</template>
