<script setup lang="ts">
  import { z } from 'zod';
  import {
    navigateTo,
    definePageMeta,
    useRuntimeConfig,
    useNuxtApp,
    ref,
    computed,
    watchDebounced,
    useCookie,
    type Ref,
    onNuxtReady
  } from '#imports';

  const { $trpc } = useNuxtApp();
  definePageMeta({ guest: true });
  const turnstileToken = ref();
  const buttonLoading = ref(false);
  const turnstileEnabled = useRuntimeConfig().public.turnstileEnabled;
  if (!turnstileEnabled) {
    turnstileToken.value = '';
  }

  //Form Fields
  const usernameValid = ref<boolean | 'remote' | null>(null);
  const usernameValue = ref('');
  const usernameValidationMessage = ref('');

  const formValid = computed(() => {
    return usernameValid.value === true;
  });

  //functions
  async function goToNextStep() {
    useCookie('un-join-username', { maxAge: 3600 }).value = usernameValue.value;
    navigateTo('/join/secure');
  }

  watchDebounced(
    usernameValue,
    async () => {
      if (usernameValid.value === 'remote') {
        const { available, error } =
          await $trpc.auth.signup.checkUsernameAvailability.query({
            turnstileToken: turnstileToken.value,
            username: usernameValue.value
          });
        //resetTurnstileToken();
        if (!available) {
          usernameValid.value = false;
          usernameValidationMessage.value = error || 'something went wrong';
        }
        available && (usernameValid.value = true);
      }
    },
    {
      debounce: 500,
      maxWait: 5000
    }
  );

  const pageReady: Ref<boolean> = ref(false);
  onNuxtReady(() => {
    pageReady.value = true;
  });
</script>

<template>
  <div
    class="flex h-screen w-screen flex-col items-center justify-between p-4 pb-14">
    <div
      class="flex w-full max-w-72 grow flex-col items-center justify-center gap-8 pb-4 md:max-w-xl">
      <h1 class="font-display mb-4 text-center text-2xl">
        Let's make your <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <h2 class="text-center text-xl font-semibold">Choose your username</h2>
      <div class="flex w-full flex-row justify-stretch gap-2">
        <UnUiTooltip
          text="Choose your username"
          class="w-full">
          <div class="bg-primary-600 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          class="w-full">
          <div class="bg-primary-400 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
          class="w-full">
          <div class="bg-primary-400 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Create your profile"
          class="w-full">
          <div class="bg-primary-400 h-2 w-full rounded" />
        </UnUiTooltip>
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-center">
          This will be your username across the whole Un ecosystem.
        </p>
        <p class="text-center">
          It's yours personally and can join as many organizations as you want.
        </p>
      </div>
      <UnUiInput
        v-model:value="usernameValue"
        v-model:valid="usernameValid"
        v-model:validationMessage="usernameValidationMessage"
        width="full"
        icon="ph:at"
        label="Username"
        helper="Can only contain letters and numbers."
        placeholder=""
        :remote-validation="true"
        :schema="
          z
            .string()
            .min(5, { message: 'Must be at least 5 characters long' })
            .max(32, {
              message: 'Too Long, Aint nobody typing that 😂'
            })
            .regex(/^[a-zA-Z0-9]*$/, {
              message: 'Only letters and numbers'
            })
        " />

      <div class="mt-3 flex w-full flex-col gap-2">
        <UnUiButton
          label="I like it"
          icon="i-ph-check"
          :loading="buttonLoading"
          :disabled="!formValid"
          block
          @click="goToNextStep()" />
        <UnUiButton
          label="Sign in instead"
          variant="ghost"
          block
          @click="navigateTo('/')" />
      </div>
      <!-- TODO: Make it look good -->
      <NuxtTurnstile
        v-if="pageReady && turnstileEnabled"
        v-model="turnstileToken"
        class="fixed bottom-5 mb-[-30px] scale-50 hover:mb-0 hover:scale-100" />
    </div>
  </div>
</template>
