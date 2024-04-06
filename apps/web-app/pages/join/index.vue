<script setup lang="ts">
  import { zodSchemas } from '@u22n/utils';
  import {
    navigateTo,
    definePageMeta,
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

  const buttonLoading = ref(false);

  //Form Fields
  const usernameValid = ref<boolean | 'remote' | null>(null);
  const usernameValue = ref('');
  const usernameValidationMessage = ref('');
  const termsAccepted = ref(false);

  const formValid = computed(() => {
    return usernameValid.value === true && termsAccepted.value === true;
  });

  //functions
  async function goToNextStep() {
    useCookie('un-join-username', { maxAge: 3600 }).value = usernameValue.value;
    navigateTo('/join/secure');
  }

  async function checkUsername() {
    if (!zodSchemas.username().safeParse(usernameValue.value).success) {
      return;
    }
    const { available, error } =
      await $trpc.auth.signup.checkUsernameAvailability.query({
        username: usernameValue.value
      });
    if (!available) {
      usernameValid.value = false;
      usernameValidationMessage.value = error || 'something went wrong';
    }
    available && (usernameValid.value = true);
  }

  watchDebounced(
    usernameValue,
    async () => {
      if (usernameValid.value === 'remote') {
        await checkUsername();
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
      <h1 class="mb-4 flex flex-col gap-2 text-center">
        <span class="text-2xl font-medium leading-none">Let's make your</span>
        <span class="font-display text-5xl leading-none">UnInbox</span>
        <div>
          <NuxtUiBadge
            label="Beta"
            size="md"
            color="amber" />
        </div>
      </h1>
      <h2 class="text-center text-xl font-semibold">Choose your username</h2>
      <div class="flex w-full flex-row justify-stretch gap-2">
        <UnUiTooltip
          text="Choose your username"
          class="w-full">
          <div class="bg-base-9 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          class="w-full">
          <div class="bg-base-5 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
          class="w-full">
          <div class="bg-base-5 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Create your profile"
          class="w-full">
          <div class="bg-base-5 h-2 w-full rounded" />
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
        :schema="zodSchemas.username()" />
      <div class="flex flex-row gap-2">
        <NuxtUiCheckbox
          v-model="termsAccepted"
          :disabled="!usernameValid" />
        <span class="text-sm">
          I agree to the UnInbox
          <a
            href="https://legal.u22n.com/uninbox/terms"
            target="_blank">
            Terms of Service
          </a>
          and
          <a
            href="https://legal.u22n.com/uninbox/privacy"
            target="_blank">
            Privacy Policy </a
          >.
        </span>
      </div>

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
        <UnUiButton
          label="Sign up for EU only datahosting"
          variant="ghost"
          size="sm"
          block
          @click="navigateTo('/eu')" />
      </div>
    </div>
  </div>
</template>
