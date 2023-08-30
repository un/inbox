<script setup lang="ts">
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();
  definePageMeta({ auth: false });

  const turnstileToken = ref();
  const buttonLoading = ref(false);

  function resetTurnstileToken() {
    turnstileToken.value?.reset();
  }
  //Form Fields
  const usernameValid = ref<boolean | null>(null);
  const usernameValue = ref('');

  const formValid = computed(() => {
    return usernameValid.value === true;
  });

  watchDebounced(usernameValue, async () => {}, {
    debounce: 250,
    maxWait: 5000
  });
</script>

<template>
  <div class="flex flex-col w-screen h-screen items-center justify-center p-4">
    <div
      class="flex flex-col max-w-72 md:max-w-xl items-center justify-center gap-8 w-full">
      <h1 class="font-display text-2xl text-center mb-4">
        Let's make your <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <h2 class="font-semibold text-xl text-center">Choose your username</h2>
      <div class="flex flex-row gap-2 w-full justify-stretch">
        <UnUiTooltip
          text="Choose your username"
          parentClass="w-full">
          <div class="h-2 bg-primary-9 rounded w-full" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          parentClass="w-full">
          <div class="h-2 bg-primary-6 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Create your profile"
          parentClass="w-full">
          <div class="h-2 bg-primary-6 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
          parentClass="w-full">
          <div class="h-2 bg-primary-6 w-full rounded" />
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
        width="full"
        icon="ph:at"
        label="Username"
        helper="Can only contain letters and numbers. Usernames less than 5 characters are available for pro users, 3 or less characters are reserved for lifetime license users"
        placeholder=""
        :remoteValidation="true"
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

      <div class="mt-3 w-full">
        <UnUiButton
          label="I like it"
          icon="ph-check"
          :loading="buttonLoading"
          :disabled="!formValid"
          width="full"
          @click="console.log('button clicked')" />
      </div>
      <NuxtTurnstile
        v-model="turnstileToken"
        class="fixed bottom-5" />
    </div>
  </div>
</template>
