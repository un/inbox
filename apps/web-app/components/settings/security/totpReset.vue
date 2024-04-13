<script setup lang="ts">
  import { onMounted, ref, useNuxtApp, useToast, watch } from '#imports';

  import { useClipboard } from '@vueuse/core';
  import { useQRCode } from '@vueuse/integrations/useQRCode';

  const { copy, copied, text } = useClipboard();
  const { $trpc } = useNuxtApp();
  const toast = useToast();

  const emit = defineEmits(['complete', 'cancel', 'close']);
  type Props = {
    verificationToken: string;
  };
  const props = defineProps<Props>();

  const loadingData = ref(true);
  const new2FAVerified = ref(false);

  // creation step
  const qrUri = ref('');
  const qrCode = useQRCode(qrUri, { width: 200, height: 200 });

  const manualCode = ref('');

  const twoFactorCode = ref<string[]>([]);

  const {
    data: new2FAData,
    status: new2FAStatus,
    mutate: getNew2FA
  } = $trpc.account.security.resetTwoFactorSecret.useMutation();

  watch(new2FAStatus, (status) => {
    if (status === 'error') {
      loadingData.value = false;
      toast.add({
        id: '2fa_error',
        title: 'Something went wrong',
        description: `Something went wrong when setting up Two Factor Authentication (2FA) on your account, please contact support.`,
        icon: 'i-ph-warning-octagon',
        color: 'orange',
        timeout: 5000
      });
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
      $trpc.account.security.completeTwoFactorReset.useMutation();
    await verifyTotp.mutate({
      code: twoFactorCode.value.join(''),
      verificationToken: props.verificationToken
    });
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
    new2FAVerified.value = true;
    toast.add({
      id: '2fa_verification_success',
      title: 'Success',
      description: `Your Two Factor Authentication (2FA) code has been verified successfully.`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
    emit('complete');
  }

  onMounted(async () => {
    await getNew2FA({ verificationToken: props.verificationToken });
  });
</script>

<template>
  <div class="flex w-full flex-col items-start">
    <div
      v-if="loadingData"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
      <UnUiIcon
        name="i-svg-spinners-90-ring"
        size="24" />
      <span>Loading 2FA</span>
    </div>
    <div
      v-if="!loadingData"
      class="flex w-full flex-col items-center gap-8">
      <div
        v-if="!new2FAVerified"
        class="grid grid-cols-2 gap-4">
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
              label="Or copy the code for manual entry"
              size="xs"
              :variant="copied && text === manualCode ? 'solid' : 'outline'"
              :color="copied && text === manualCode ? 'teal' : 'primary'"
              @click="copy(manualCode)" />
          </div>
        </div>
        <div class="flex flex-col items-center gap-4">
          <span class="text-xl font-medium">Step 2</span>
          <span class="">
            Enter the 6-digit code from your 2FA app to generate your recovery
            codes
          </span>
          <div class="flex grow flex-col items-center justify-center gap-4">
            <Un2FAInput v-model="twoFactorCode" />
            <UnUiButton
              label="Verify Code"
              @click="verify2FA()" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
