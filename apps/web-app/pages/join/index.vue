<script setup lang="ts">
  import { stringify } from 'superjson';
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();
  definePageMeta({ skipAuth: true });

  const turnstileToken = ref();
  const buttonLoading = ref(false);

  function resetTurnstileToken() {
    turnstileToken.value?.reset();
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
    navigateTo('/join/passkey');
  }

  watchDebounced(
    usernameValue,
    async () => {
      if (usernameValid.value === 'remote') {
        const { available, error } =
          await $trpc.signup.checkUsernameAvailability.query({
            turnstileToken: turnstileToken.value,
            username: usernameValue.value
          });
        //resetTurnstileToken();
        console.log(available, error);
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
</script>

<template>
  <div
    class="flex flex-col w-screen h-screen items-center justify-between p-4 pb-14">
    <div
      class="flex flex-col max-w-72 md:max-w-xl items-center justify-center gap-8 w-full grow pb-4">
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
          <div
            class="h-2 bg-primary-6 w-full rounded"
            @click="navigateTo('/join/passkey')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Create your profile"
          parentClass="w-full">
          <div
            class="h-2 bg-primary-6 w-full rounded"
            @click="navigateTo('/join/profile')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
          parentClass="w-full">
          <div
            class="h-2 bg-primary-6 w-full rounded"
            @click="navigateTo('/join/org')" />
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
          @click="goToNextStep()" />
      </div>
      <ClientOnly>
        <NuxtTurnstile
          v-model="turnstileToken"
          class="fixed bottom-5 scale-50 mb-[-30px] hover:(scale-100 mb-0)" />
      </ClientOnly>
    </div>
  </div>
</template>
