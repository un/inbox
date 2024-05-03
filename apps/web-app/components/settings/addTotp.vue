<script setup lang="ts">
  import {
    computed,
    navigateTo,
    onMounted,
    ref,
    useNuxtApp,
    useCookie,
    useToast,
    watch
  } from '#imports';

  import { useClipboard } from '@vueuse/core';
  import { useQRCode } from '@vueuse/integrations/useQRCode';

  const { copy, copied, text } = useClipboard();
  const { $trpc } = useNuxtApp();
  const toast = useToast();

  const emit = defineEmits(['complete', 'cancel']);

  const username = ref('');
  if (process.client) {
    const usernameCookie = useCookie('un-join-username').value;
    !usernameCookie
      ? navigateTo('/join')
      : (username.value = usernameCookie || '');
  }

  const loadingData = ref(true);
  const alreadySetUpError = ref(false);
  const showResetTotpModal = ref(false);
  const disable2FALoading = ref(false);
  const new2FAVerified = ref(false);
  const showConfirmCopiedModal = ref(false);
  const savedRecoveryCode = ref(false);

  // creation step
  const qrUri = ref('');
  const qrCode = useQRCode(qrUri, { width: 200, margin: 5 });

  const manualCode = ref('');

  // verification Step
  const twoFactorCode = ref<string[]>([]);
  const recoveryCode = ref('');

  const twoFactorCodeValid = computed(() => {
    return twoFactorCode.value.length === 6;
  });

  const {
    data: new2FAData,
    status: new2FAStatus,
    error: new2FAError,
    mutate: getNew2FA
  } = $trpc.auth.twoFactorAuthentication.createTwoFactorSecret.useMutation();

  watch(new2FAStatus, (status) => {
    if (status === 'error') {
      loadingData.value = false;
      if (
        new2FAError?.value?.message ===
        'Two Factor Authentication (2FA) is already set up for this account'
      ) {
        alreadySetUpError.value = true;
      }
    }
    if (status === 'success') {
      loadingData.value = false;
      qrUri.value = new2FAData?.value?.uri || '';
      const secretMatch = qrUri.value.match(/secret=([^&]+)/);
      manualCode.value = secretMatch && secretMatch[1] ? secretMatch[1] : '';
    }
  });

  async function verify2FA() {
    const verifyTotp =
      $trpc.auth.twoFactorAuthentication.verifyTwoFactor.useMutation();
    await verifyTotp.mutate({ twoFactorCode: twoFactorCode.value.join('') });
    if (verifyTotp.error.value) {
      toast.add({
        id: '2fa_error',
        title: 'Something went wrong',
        description: `Please re-enter your 6 digit code`,
        icon: 'i-ph-warning-octagon',
        color: 'orange',
        timeout: 5000
      });
      new2FAVerified.value = false;
      return;
    }
    recoveryCode.value = verifyTotp.data?.value?.recoveryCode || '';
    new2FAVerified.value = true;
    toast.add({
      id: '2fa_verification_success',
      title: 'Success',
      description: `Your Two Factor Authentication (2FA) code has been verified successfully.`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
  }

  function showReset2FA() {
    twoFactorCodeValid.value ? (showResetTotpModal.value = true) : null;
  }

  async function reset2FA() {
    disable2FALoading.value = true;
    const reset2FAMutation =
      $trpc.auth.twoFactorAuthentication.disableTwoFactor.useMutation();
    await reset2FAMutation.mutate({
      twoFactorCode: twoFactorCode.value.join('')
    });
    if (reset2FAMutation.error.value) {
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
    await getNew2FA({});
    showResetTotpModal.value = false;
    twoFactorCode.value = [];
    alreadySetUpError.value = false;
  }

  function download() {
    const element = document.createElement('a');
    element.style.display = 'none';
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(recoveryCode.value)
    );
    element.setAttribute('download', `${username.value}-recovery-code.txt`);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  onMounted(async () => {
    await getNew2FA({});
  });
</script>

<template>
  <div class="flex w-full flex-col items-start">
    <UnUiModal v-model="showResetTotpModal">
      <template #header>
        <span class="">Are you sure you want to reset 2FA?</span>
      </template>

      <div class="flex flex-col gap-2">
        <span class="">
          This will disable two factor authentication on your account.
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
            :loading="disable2FALoading"
            :disabled="disable2FALoading"
            @click="reset2FA()" />
          <UnUiButton
            label="Cancel"
            variant="outline"
            @click="showResetTotpModal = false" />
        </div>
      </template>
    </UnUiModal>
    <UnUiModal v-model="showConfirmCopiedModal">
      <template #header>
        <span class="">Are your codes backed up securely?</span>
      </template>
      <div class="flex flex-col gap-2">
        <span class="">
          If you ever lose your password or your 2FA device, you will need these
          codes to recover your account.
        </span>
        <span class=""> Are you sure they're backed up safely? </span>
      </div>
      <template #footer>
        <div class="flex flex-row gap-2">
          <UnUiButton
            label="Confirm"
            color="orange"
            @click="emit('complete')" />
          <UnUiButton
            label="Go Back"
            variant="outline"
            @click="showConfirmCopiedModal = false" />
        </div>
      </template>
    </UnUiModal>
    <div
      v-if="loadingData"
      class="flex flex-col items-center gap-2">
      <span class="text-lg"> Loading</span>
    </div>
    <div
      v-if="alreadySetUpError && !loadingData"
      class="flex flex-col items-center gap-4">
      <div class="flex flex-col items-center gap-2">
        <span class="text-lg"> 2FA is already set up on this account </span>
        <div class="flex flex-col items-start">
          <span>
            To reset 2FA on this account, you need to use your current 2FA
            calculator.
          </span>
          <span>
            If you lost access to your 2FA calculator, please log into your
            account with a recovery code.
          </span>
        </div>
      </div>
      <Un2FAInput
        v-model="twoFactorCode"
        class="" />
      <UnUiButton
        label="Disable 2FA"
        color="red"
        :disabled="!twoFactorCodeValid"
        @click="showReset2FA()" />
    </div>
    <div
      v-if="!alreadySetUpError && !loadingData"
      class="flex w-full flex-col items-center gap-8">
      <div
        v-if="!new2FAVerified"
        class="flex flex-col gap-4 md:flex-row">
        <div class="flex flex-col items-center gap-4">
          <span class="text-xl font-medium">Step 1</span>
          <div v-if="new2FAStatus === 'pending'">Loading new TOTP</div>
          <div
            v-if="new2FAStatus === 'success'"
            class="flex flex-col items-center gap-4">
            <span>Scan the QR code below with your 2FA app</span>
            <div class="mb-4">
              <img
                :src="qrCode"
                alt="QR Code"
                class="rounded-lg p-2 shadow-xl" />
            </div>
            <UnUiButton
              label="Copy for manual entry"
              size="xs"
              :variant="copied && text === manualCode ? 'solid' : 'outline'"
              :color="copied && text === manualCode ? 'teal' : 'primary'"
              @click="copy(manualCode)" />
          </div>
        </div>
        <div class="flex flex-col items-center gap-4">
          <span class="text-xl font-medium">Step 2</span>
          <span class="px-2 text-center">
            Enter the 6-digit code from your 2FA app to generate your recovery
            codes
          </span>
          <div class="flex grow flex-col items-center justify-center gap-4">
            <Un2FAInput v-model="twoFactorCode" />
            <UnUiButton
              label="Verify Code"
              size="lg"
              :disabled="!twoFactorCodeValid"
              @click="verify2FA()" />
          </div>
        </div>
      </div>
      <div
        v-if="new2FAVerified"
        class="flex flex-col items-center gap-4">
        <span class="text-xl font-medium">Step 3</span>
        <span class="w-fit text-balance text-center font-medium">
          Save your recovery code. Keep it in a safe and secure place as It can
          be used to gain access to your account. If you lose it, you will not
          be able to recover your your account.
        </span>
        <div
          class="bg-base-3 mb-2 mt-2 flex items-center justify-center gap-2 rounded-md p-2">
          <span class="select-all break-all px-2 font-mono">{{
            recoveryCode
          }}</span>
          <span>
            <UnUiButton
              size="xs"
              variant="ghost"
              class="h-10 w-10"
              :icon="
                copied && text === recoveryCode ? 'i-ph-check' : 'i-ph-copy'
              "
              @click="
                () => {
                  copy(recoveryCode);
                  savedRecoveryCode = true;
                }
              " />
          </span>
        </div>
        <div class="flex flex-col gap-2 md:flex-row">
          <UnUiButton
            label="Download Recovery Code File"
            variant="ghost"
            icon="i-ph-download"
            @click="
              () => {
                download();
                savedRecoveryCode = true;
              }
            " />
          <UnUiButton
            label="I've saved my recovery code"
            :disabled="!savedRecoveryCode"
            @click="showConfirmCopiedModal = true" />
        </div>
      </div>
    </div>
  </div>
</template>
