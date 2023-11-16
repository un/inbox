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
    class="h-screen w-screen flex flex-col items-center justify-between p-4 pb-14">
    <div
      class="max-w-72 w-full flex grow flex-col items-center justify-center gap-8 pb-4 md:max-w-xl">
      <h1 class="mb-4 text-center text-2xl font-display">
        Let's make your <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <h2 class="text-center text-xl font-semibold">Choose your username</h2>
      <div class="w-full flex flex-row justify-stretch gap-2">
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
          text="Create your profile"
          class="w-full">
          <div class="bg-primary-400 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
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
        helper="Can only contain letters and numbers. Usernames less than 5 characters are available for pro users, 3 or less characters are reserved for lifetime license users"
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

      <div class="mt-3 w-full">
        <UnUiButton
          label="I like it"
          icon="i-ph-check"
          :loading="buttonLoading"
          :disabled="!formValid"
          block
          @click="goToNextStep()" />
      </div>
      <ClientOnly>
        <NuxtTurnstile
          v-model="turnstileToken"
          class="fixed bottom-5 mb-[-30px] scale-50 hover:(mb-0 scale-100)" />
      </ClientOnly>
    </div>
  </div>
</template>
