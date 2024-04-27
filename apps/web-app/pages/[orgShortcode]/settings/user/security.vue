<script setup lang="ts">
  import { z } from 'zod';

  import {
    useNuxtApp,
    useToast,
    ref,
    watch,
    computed,
    until,
    useRoute,
    useCookie
  } from '#imports';
  import { useUtils } from '~/composables/utils';
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
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg
  const orgShortcode = useRoute().params.orgShortcode as string;
  const urlParams = useRoute().query;
  const has2FAError = urlParams['error'] === '2fa';
  const verificationCookie = useCookie('authVerificationToken');

  const { $trpc } = useNuxtApp();
  const toast = useToast();
  const verificationToken = ref<string | null>(null);
  const verificationModalOpen = ref(false);

  // check if the users device can directly support passkeys
  const isArc = ref(useUtils().isArcBrowser());
  const passkeyType = await (async () => {
    if (isArc.value === true) {
      return 'cross-platform';
    }
    return (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
      ? 'platform'
      : 'cross-platform';
  })();

  const {
    data,
    status,
    refresh: refreshSecurityData
  } = $trpc.account.security.getSecurityOverview.useQuery({});

  watch(status, (newStatus) => {
    if (newStatus === 'success') {
      passwordEnabled.value = data.value?.passwordSet ?? false;
      twoFactorEnabled.value = data.value?.twoFactorEnabled ?? false;
      recoveryCodeSet.value = data.value?.recoveryCodeSet ?? false;
      legacySecurity.value = data.value?.legacySecurityEnabled ?? false;
    }
  });

  const hasPasskeys = computed(() => {
    return data.value?.passkeys.length ?? 0;
  });

  const passwordEnabled = ref(false);
  const twoFactorEnabled = ref(false);
  const recoveryCodeSet = ref(false);
  const legacySecurity = ref(false);

  const canDisableLegacySecurity = computed(() => {
    if (hasPasskeys.value) {
      return true;
    }
    if (passwordEnabled.value && !twoFactorEnabled.value) {
      return true;
    }
    return false;
  });

  const canDeletePasskeys = computed(() => {
    console.log('legacySecurity', legacySecurity.value, 'data', data.value);
    if (legacySecurity.value || (data.value?.passkeys.length ?? 0) > 1) {
      return true;
    }
    return false;
  });

  const verificationPasswordInput = ref<string | undefined>(undefined);
  const verificationTwoFactorCodeInput = ref<string[]>([]);
  const verificationPasswordValid = ref(false);
  const passwordValidationMessage = ref('');
  const passkeyVerificationData = ref<AuthenticationResponseJSON | null>(null);
  const verifying = ref<'passkey' | 'password' | null>(null);
  const showResetPasswordModal = ref(false);
  const showReset2FAModal = ref(false);
  const showRecoveryCodeModal = ref(false);
  const recoveryCodeStep = ref<string>('start');
  const showEnableLegacySecurityModal = ref(false);
  const legacySecurityStep = ref<string>('start');
  const legacyLoading = ref(false);
  const recoveryLoading = ref(false);

  //* Verification Code Functions
  async function getVerificationToken(): Promise<void> {
    if (!verificationPasswordInput.value && !passkeyVerificationData.value) {
      return;
    }

    const input = passkeyVerificationData.value
      ? { verificationResponseRaw: passkeyVerificationData.value }
      : {
          password: verificationPasswordInput.value,
          twoFactorCode: verificationTwoFactorCodeInput.value.join('')
        };

    const { data: verificationData } =
      await $trpc.account.security.getVerificationToken.useQuery(input);
    if (verificationData.value) {
      verificationToken.value = verificationData.value.token;
    }
  }

  async function getPasskeyChallenge(): Promise<void> {
    verifying.value = 'passkey';
    const { data: passkeyData } =
      await $trpc.account.security.generatePasskeyVerificationChallenge.useQuery(
        {}
      );

    if (!passkeyData?.value?.options) {
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
      const passkeyDataAuthentication = await startAuthentication(
        passkeyData.value.options
      );
      if (!passkeyDataAuthentication) {
        throw new Error('No passkey data returned');
      }
      passkeyVerificationData.value = passkeyDataAuthentication;
      await getVerificationToken();
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

  async function waitForVerification() {
    if (verificationCookie.value) {
      verificationToken.value = verificationCookie.value;
      return true;
    }

    if (verificationToken.value) {
      return true;
    }

    verificationModalOpen.value = true;

    await Promise.race([
      until(verificationToken).toBeTruthy(),
      until(verificationModalOpen).toBe(false)
    ]);

    verificationModalOpen.value = false;
    return Boolean(verificationToken.value);
  }

  const passkeyNewButtonLoading = ref(false);
  async function addPasskey() {
    passkeyNewButtonLoading.value = true;
    if (!(await waitForVerification())) return;

    const { options } =
      await $trpc.account.security.generateNewPasskeyChallenge.query({
        verificationToken: verificationToken.value!,
        authenticatorType: passkeyType
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
      verificationToken: verificationToken.value!,
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
    if (!(await waitForVerification())) return;

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
        verificationToken: verificationToken.value!,
        passkeyPublicId: passkeyPublicId
      });
      if (!result.success) {
        toast.add({
          id: 'passkey_error',
          title: 'Passkey error',
          description: "Couldn't delete the passkey, please try again.",
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
    if (!(await waitForVerification())) return;
    if (!confirm) {
      sessionPublicIdToDelete.value = sessionPublicId;
      showConfirmSessionDeleteModal.value = true;
    }
    if (confirm) {
      const result = await $trpc.account.security.deleteSession.mutate({
        verificationToken: verificationToken.value!,
        sessionPublicId: sessionPublicId
      });
      if (!result.success) {
        toast.add({
          id: 'session_error',
          title: 'Session error',
          description: "Couldn't delete the session, please try again.",
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
    if (!(await waitForVerification())) return;

    if (!confirm) {
      showConfirmSessionDeleteAllModal.value = true;
    }
    if (confirm) {
      const result = await $trpc.account.security.deleteAllSessions.mutate({
        verificationToken: verificationToken.value!
      });
      if (!result.success) {
        toast.add({
          id: 'session_error',
          title: 'Session error',
          description: "Couldn't delete the sessions, please try again.",
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

  async function toggleLegacySecurity() {
    legacyLoading.value = true;
    if (!(await waitForVerification())) return;

    if (legacySecurity.value) {
      const result = await $trpc.account.security.disableLegacySecurity.mutate({
        verificationToken: verificationToken.value!
      });
      if (result.success) {
        toast.add({
          title: 'Legacy security Disabled',
          description:
            'You will no longer be able to sign in with passwords and 2FA',
          color: 'green',
          timeout: 5000,
          icon: 'i-ph-check-circle'
        });
        legacySecurity.value = false;
      } else {
        toast.add({
          title: 'Legacy Security Error',
          description: 'Something went wrong when disabling legacy security.',
          color: 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
      }
    } else {
      showEnableLegacySecurityModal.value = true;
      legacySecurityStep.value = 'password';
      await until(legacySecurityStep).toMatch(
        (v) => v === 'complete' || v === 'start'
      );
      toast.add({
        title:
          legacySecurityStep.value === 'complete'
            ? 'Legacy security Enabled'
            : 'Canceled',
        description:
          legacySecurityStep.value === 'complete'
            ? 'You can now sign in with passwords and 2FA'
            : 'Cancelled enabling legacy security',
        color: legacySecurityStep.value === 'complete' ? 'green' : 'yellow',
        timeout: 5000,
        icon: 'i-ph-check-circle'
      });
      showEnableLegacySecurityModal.value = false;
      legacySecurity.value =
        legacySecurityStep.value === 'complete' ? true : false;
    }
  }

  async function toggleRecoveryCode() {
    recoveryLoading.value = true;
    if (!(await waitForVerification())) return;

    if (recoveryCodeSet.value) {
      const result = await $trpc.account.security.disableRecoveryCode.mutate({
        verificationToken: verificationToken.value!
      });
      if (result.success) {
        toast.add({
          title: 'Recovery Code Disabled',
          description: 'You will no longer be able to recover your account.',
          color: 'green',
          timeout: 5000,
          icon: 'i-ph-check-circle'
        });
        recoveryCodeSet.value = false;
      } else {
        toast.add({
          title: 'Recovery Code Error',
          description: 'Something went wrong when disabling recovery code.',
          color: 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
      }
    } else {
      showRecoveryCodeModal.value = true;
      await until(recoveryCodeStep).toMatch(
        (v) => v === 'complete' || v === 'close'
      );
      toast.add({
        title:
          recoveryCodeStep.value === 'complete'
            ? 'Recovery Code Enabled'
            : 'Canceled',
        description:
          recoveryCodeStep.value === 'complete'
            ? 'You can now recover your account with a recovery code'
            : 'Cancelled enabling recovery code',
        color: recoveryCodeStep.value === 'complete' ? 'green' : 'yellow',
        timeout: 5000,
        icon: 'i-ph-check-circle'
      });
      showRecoveryCodeModal.value = false;
      recoveryCodeSet.value =
        recoveryCodeStep.value === 'complete' ? true : false;
    }
  }

  async function resetPassword() {
    if (!(await waitForVerification())) return;
    showResetPasswordModal.value = true;
    await until(showResetPasswordModal).toBe(false);
  }

  async function reset2FA() {
    if (!(await waitForVerification())) return;
    showReset2FAModal.value = true;
    await until(showReset2FAModal).toBe(false);
  }

  async function resetRecoveryCode() {
    if (!(await waitForVerification())) return;
    showRecoveryCodeModal.value = true;
    await until(recoveryCodeStep).toMatch(
      (v) => v === 'complete' || v === 'close'
    );
    recoveryLoading.value = false;
    showRecoveryCodeModal.value = false;
  }
</script>

<template>
  <div
    class="flex h-full w-full flex-col items-start gap-8 overflow-y-auto px-4 py-2">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row gap-2">
        <UnUiButton
          v-if="isMobile"
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="navigateTo(`/${orgShortcode}/settings`)" />
        <span class="font-display text-2xl">Your Account Security</span>
      </div>
    </div>
    <div class="w-full">
      <UnUiAlert
        v-if="has2FAError"
        title="Your account is not secure"
        description="You need to reset your Password and 2FA because you either recovered your account or you didn't setup 2FA properly. If you don't do it now you will loose access to your account permanently."
        color="red"
        icon="i-ph-warning-octagon" />
    </div>
    <div
      v-if="status !== 'success'"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
      <UnUiIcon
        name="i-svg-spinners-90-ring"
        size="24" />
      <span>Loading your profile</span>
    </div>
    <div
      v-if="status === 'success'"
      class="flex w-full flex-col items-start justify-center gap-4 pb-14">
      <div class="flex flex-col gap-2">
        <div class="flex gap-4">
          <span class="text-lg font-medium">Use Password & 2FA</span>

          <UnUiTooltip
            v-if="!canDisableLegacySecurity"
            text="Add a passkey to disable password signin">
            <UnUiToggle
              :model-value="legacySecurity"
              disabled="true"
              :loading="legacyLoading"
              label="Use Password & 2FA"
              @click="
                toggleLegacySecurity().finally(() => {
                  legacyLoading = false;
                  refreshSecurityData();
                })
              " />
          </UnUiTooltip>
          <UnUiToggle
            v-else
            :model-value="legacySecurity"
            :loading="legacyLoading"
            label="Use Password & 2FA"
            @click="
              toggleLegacySecurity().finally(() => {
                legacyLoading = false;
                refreshSecurityData();
              })
            " />
        </div>
        <div
          v-if="legacySecurity"
          class="flex flex-col gap-2">
          <div>You are currently using password and 2FA for your account.</div>
          <div class="flex flex-wrap gap-2">
            <UnUiButton
              label="Reset Password"
              @click="
                resetPassword().finally(() => {
                  refreshSecurityData();
                })
              " />
            <UnUiButton
              label="Reset 2FA"
              @click="
                reset2FA().finally(() => {
                  refreshSecurityData();
                })
              " />
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex gap-4">
          <span class="text-lg font-medium">Recovery Code</span>
          <UnUiToggle
            :model-value="recoveryCodeSet"
            :loading="recoveryLoading"
            label="Toddle Recovery Code"
            @click="
              toggleRecoveryCode().finally(() => {
                recoveryLoading = false;
                refreshSecurityData();
              })
            " />
        </div>
        <UnUiButton
          v-if="recoveryCodeSet"
          label="Reset Recovery Code"
          class="w-fit"
          @click="
            resetRecoveryCode().finally(() => {
              refreshSecurityData();
            })
          " />
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-lg font-medium">Passkeys</span>
        <div
          v-if="data?.passkeys?.length !== 0"
          class="flex w-full flex-row items-center justify-between gap-4">
          <template
            v-for="passkey of data?.passkeys"
            :key="passkey.publicId">
            <div
              class="bg-base-3 flex cursor-pointer flex-row items-center gap-4 rounded-xl p-3">
              <div class="flex flex-col gap-0">
                <span class="text-sm font-medium">
                  {{ passkey.nickname }}
                </span>
                <span class="text-xs">
                  <UnUiTooltip :text="passkey.createdAt.toLocaleString()">
                    Created: {{ passkey.createdAt.toLocaleDateString() }}
                  </UnUiTooltip>
                </span>
              </div>
              <UnUiTooltip
                v-if="!canDeletePasskeys"
                text="Add a password & 2FA to disable passkey signin">
                <UnUiButton
                  disabled="true"
                  size="sm"
                  square
                  color="red"
                  icon="i-ph-trash"
                  class="h-full"
                  @click="
                    deletePasskey({
                      passkeyPublicId: passkey.publicId
                    })
                  " />
              </UnUiTooltip>
              <UnUiButton
                v-else
                size="sm"
                square
                color="red"
                icon="i-ph-trash"
                class="h-full"
                @click="
                  deletePasskey({
                    passkeyPublicId: passkey.publicId
                  })
                " />
            </div>
          </template>
        </div>
        <UnUiButton
          label="Add Passkey"
          class="w-fit"
          color="green"
          icon="i-ph-plus"
          @click="addPasskey()" />
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-lg font-medium">Sessions</span>
        <div class="flex w-full flex-row flex-wrap items-center gap-4">
          <template
            v-for="session of data?.sessions"
            :key="session.publicId">
            <div
              class="bg-base-3 flex flex-row flex-wrap items-center gap-4 rounded-xl p-3">
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
        </div>
        <UnUiButton
          class="w-fit"
          color="red"
          icon="i-ph-trash"
          trailing
          label="Log out of all devices"
          @click="deleteAllSessions({ confirm: false })" />
      </div>

      <UnUiModal
        v-model="verificationModalOpen"
        prevent-close>
        <template #header>
          <div class="flex flex-row items-center gap-2">
            <span class="text-red-9 text-2xl leading-none">
              <UnUiIcon
                name="i-ph-warning-octagon"
                size="xl" />
            </span>
            <span class="text-lg font-semibold leading-none">
              Verification Required
            </span>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <span class="">
            Before you can change security settings, you need to verify you are
            authorized.
          </span>
          <div
            v-if="legacySecurity"
            class="flex flex-col gap-4">
            <div class="flex w-fit flex-col gap-3">
              <UnUiInput
                v-model:value="verificationPasswordInput"
                v-model:valid="verificationPasswordValid"
                v-model:validationMessage="passwordValidationMessage"
                icon="i-ph-password"
                label="Password"
                password
                class="w-full px-2"
                placeholder=""
                :schema="z.string().min(8)" />
              <div class="w-fit">
                <span class="px-2 text-sm font-medium">2FA Code</span>
                <Un2FAInput v-model="verificationTwoFactorCodeInput" />
              </div>
            </div>
            <div>
              <UnUiButton
                label="Verify with your password and 2FA"
                :loading="verifying === 'password'"
                :disabled="
                  !verificationPasswordValid ||
                  verificationTwoFactorCodeInput.length !== 6
                "
                class="w-fit"
                @click="
                  getVerificationToken().finally(() => (verifying = null))
                " />
            </div>
          </div>
          <UnUiDivider
            v-if="legacySecurity && hasPasskeys"
            label="or" />
          <div v-if="hasPasskeys">
            <UnUiButton
              label="Verify with your passkey"
              :loading="verifying === 'passkey'"
              @click="
                getPasskeyChallenge().finally(() => (verifying = null))
              " />
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

      <UnUiModal
        v-model="showEnableLegacySecurityModal"
        prevent-close>
        <template #header>
          <div class="flex flex-row items-center gap-2">
            <span class="text-red-9 text-2xl leading-none">
              <UnUiIcon
                name="i-ph-warning-octagon"
                size="xl" />
            </span>
            <span class="text-lg font-semibold leading-none">
              Enable Legacy Security
            </span>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <span class=""> </span>
          <span class="">
            Please enter your new password, and follow the 2FA prompts on the
            next screen.
          </span>
          <div>
            <div
              v-if="legacySecurityStep === 'password'"
              class="flex flex-col gap-4">
              <SettingsSecurityPasswordReset
                :verification-token="verificationToken!"
                @close="legacySecurityStep = 'start'"
                @complete="legacySecurityStep = '2fa'" />
            </div>
            <div class="flex flex-col gap-4">
              <SettingsSecurityTotpReset
                v-if="legacySecurityStep === '2fa'"
                :verification-token="verificationToken!"
                @close="legacySecurityStep = 'start'"
                @complete="legacySecurityStep = 'complete'" />
            </div>
          </div>
        </div>
      </UnUiModal>

      <UnUiModal
        v-model="showResetPasswordModal"
        prevent-close>
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
            @complete="showResetPasswordModal = false" />
        </div>
      </UnUiModal>

      <UnUiModal
        v-model="showReset2FAModal"
        prevent-close>
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
            @complete="showReset2FAModal = false" />
        </div>
      </UnUiModal>

      <UnUiModal
        v-model="showRecoveryCodeModal"
        prevent-close>
        <template #header>
          <div class="flex flex-row items-center gap-2">
            <span class="text-red-9 text-2xl leading-none">
              <UnUiIcon
                name="i-ph-warning-octagon"
                size="xl" />
            </span>
            <span class="text-lg font-semibold leading-none">
              Enable Recovery Code
            </span>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <SettingsSecurityRecoveryCode
            :verification-token="verificationToken!"
            @close="recoveryCodeStep = 'close'"
            @complete="recoveryCodeStep = 'complete'" />
        </div>
      </UnUiModal>

      <UnUiModal
        v-model="showConfirmPasskeyDeleteModal"
        prevent-close>
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

      <UnUiModal
        v-model="showConfirmSessionDeleteModal"
        prevent-close>
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

      <UnUiModal
        v-model="showConfirmSessionDeleteAllModal"
        prevent-close>
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
