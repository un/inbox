<script setup lang="ts">
  import { onMounted, ref, useNuxtApp, useToast, watch } from '#imports';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc } = useNuxtApp();
  const toast = useToast();

  const emit = defineEmits(['complete', 'cancel', 'close']);
  type Props = {
    verificationToken: string;
  };
  const props = defineProps<Props>();

  const showConfirmCopiedModal = ref(false);
  const savedRecoveryCode = ref(false);

  const {
    data: recoveryCode,
    status: recoveryCodeStatus,
    mutate: getRecoveryCode
  } = $trpc.account.security.resetRecoveryCode.useMutation();

  watch(recoveryCodeStatus, (v) => {
    if (v === 'error') {
      toast.add({
        id: 'recovery_code_error',
        title: 'Something went wrong',
        description: `Something went wrong when setting up Recovery Code on your account, please contact support.`,
        icon: 'i-ph-warning-octagon',
        color: 'orange',
        timeout: 5000
      });
    }
  });

  function download() {
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' +
        encodeURIComponent(recoveryCode.value?.recoveryCode || '')
    );
    element.setAttribute('download', `uninbox-recovery-code.txt`);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function completeProcess() {
    showConfirmCopiedModal.value = false;
    emit('complete');
  }

  onMounted(async () => {
    await getRecoveryCode({ verificationToken: props.verificationToken });
  });
</script>

<template>
  <div class="flex w-full flex-col items-start">
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
            @click="completeProcess()" />
          <UnUiButton
            label="Go Back"
            variant="outline"
            @click="showConfirmCopiedModal = false" />
        </div>
      </template>
    </UnUiModal>
    <div
      v-if="recoveryCodeStatus === 'pending'"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
      <UnUiIcon
        name="i-svg-spinners-90-ring"
        size="24" />
      <span>Loading Recovery Code</span>
    </div>
    <div
      v-if="recoveryCodeStatus === 'success'"
      class="flex flex-col items-center gap-4">
      <span class="text-xl font-medium"></span>
      <span class="w-fit text-balance text-center font-medium">
        Save your recovery code. Keep it in a safe and secure place as It can be
        used to gain access to your account. If you lose it, you will not be
        able to recover your account.
      </span>
      <div
        class="bg-base-11 dark:bg-base-11 mb-2 mt-2 flex items-center justify-center gap-2 rounded-md p-2">
        <span class="select-all px-2 font-mono">{{
          recoveryCode?.recoveryCode
        }}</span>
        <span>
          <UnUiButton
            size="xs"
            variant="ghost"
            class="h-10 w-10"
            :icon="
              copied && text === recoveryCode?.recoveryCode
                ? 'i-ph-check'
                : 'i-ph-copy'
            "
            @click="
              () => {
                copy(recoveryCode?.recoveryCode || '');
                savedRecoveryCode = true;
              }
            " />
        </span>
      </div>
      <div class="flex flex-row gap-2">
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
</template>
