<script setup lang="ts">
  import { z } from 'zod';
  import {
    definePageMeta,
    useNuxtApp,
    useToast,
    ref,
    computed,
    watchDebounced
  } from '#imports';

  const { $trpc } = useNuxtApp();
  definePageMeta({ guest: true });
  const emit = defineEmits(['close', 'complete']);
  const buttonLoading = ref(false);

  type Props = {
    verificationToken: string;
  };
  const props = defineProps<Props>();

  const formValid = computed(() => {
    return (
      passwordStats.value?.allowed === true &&
      passwordConfirmationValid.value === true
    );
  });

  // Password Form Fields
  const passwordInput = ref('');
  const passwordStats = ref<{
    score: number | null;
    crackTime: string | null;
    allowed: boolean | null;
  }>({
    score: null,
    crackTime: null,
    allowed: null
  });

  const passwordConfirmationInput = ref('');
  const passwordConfirmationValid = ref<boolean | null>(null);
  const passwordConfirmationValidationMessage = ref('');

  watchDebounced(
    passwordInput,
    async () => {
      if (passwordInput.value === '') return;
      const res = await $trpc.account.security.checkPasswordStrength.query({
        password: passwordInput.value
      });
      passwordStats.value = res;
    },
    {
      debounce: 600,
      maxWait: 5000
    }
  );

  watchDebounced(
    passwordConfirmationInput,
    async () => {
      if (passwordConfirmationInput.value === passwordInput.value) {
        passwordConfirmationValidationMessage.value = '';
        passwordConfirmationValid.value = true;
        return;
      }
      passwordConfirmationValidationMessage.value = 'Passwords do not match';
      passwordConfirmationValid.value = false;
    },
    {
      debounce: 600,
      maxWait: 5000
    }
  );

  //functions
  const toast = useToast();
  async function setPassword() {
    buttonLoading.value = true;
    const setPassword = await $trpc.account.security.setPassword.mutate({
      newPassword: passwordInput.value,
      verificationToken: props.verificationToken
    });

    if (!setPassword.success) {
      toast.add({
        id: 'password_error',
        title: 'Password error',
        description: 'Something went wrong when signing Up, please try again.',
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });

      buttonLoading.value = false;

      return;
    }
    toast.add({
      title: 'Password Set',
      description: 'Your new password has been set.',
      color: 'green',
      timeout: 5000,
      icon: 'i-ph-check-circle'
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    emit('complete');
    emit('close');
  }
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <UnUiInput
      v-model:value="passwordInput"
      :valid="passwordStats.allowed"
      width="full"
      icon="i-ph-password"
      label="Password"
      password
      placeholder="" />
    <div v-if="passwordInput !== ''">
      <p class="text-sm">
        Your password is
        <span
          :class="
            [
              'font-bold',
              passwordStats.score && passwordStats.score >= 3
                ? 'text-green-9'
                : 'text-red-9'
            ].join(' ')
          ">
          {{
            ['very weak', 'weak', 'fair', 'strong', 'very strong'][
              passwordStats.score || 0
            ]
          }}
        </span>
      </p>
      <div class="flex flex-row items-center gap-1">
        <UnUiIcon
          name="i-ph-check-circle-fill"
          :class="
            passwordStats.score && passwordStats.score >= 3
              ? 'text-green-9'
              : 'text-red-9'
          " />
        <span class="text-base-11 dark:text-base-11 text-sm leading-none">
          It would take {{ passwordStats.crackTime }} to crack
        </span>
      </div>
    </div>
    <UnUiInput
      v-model:value="passwordConfirmationInput"
      v-model:valid="passwordConfirmationValid"
      v-model:validationMessage="passwordConfirmationValidationMessage"
      width="full"
      icon="i-ph-password"
      label="Confirm"
      password
      placeholder=""
      :schema="z.string()" />
    <div class="grid grid-cols-2 items-center gap-4">
      <UnUiButton
        label="Cancel"
        icon="i-ph-x"
        variant="outline"
        @click="emit('close')" />
      <UnUiButton
        label="Set Password"
        icon="i-ph-password"
        :loading="buttonLoading"
        :disabled="!formValid"
        @click="setPassword()" />
    </div>
  </div>
</template>
