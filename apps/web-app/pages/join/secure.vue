<script setup lang="ts">
  import { startRegistration } from '@simplewebauthn/browser';
  import type { RegistrationResponseJSON } from '@simplewebauthn/types';
  import { z } from 'zod';
  import {
    navigateTo,
    definePageMeta,
    useNuxtApp,
    useToast,
    ref,
    computed,
    watch,
    watchDebounced,
    useCookie,
    type Ref,
    onNuxtReady
  } from '#imports';
  import { useUtils } from '~/composables/utils';

  const { $trpc } = useNuxtApp();

  definePageMeta({ guest: true });

  const buttonLoading = ref(false);
  const buttonLabel = ref('Create my account');
  const howToAddPasskeyDialogOpen = ref(false);
  const instructionSet = ref<'ios' | 'android' | ''>('');
  const pageError = ref(false);

  const accountCreated = ref(false);
  const passkeyCreated = ref(false);
  const passwordCreated = ref(false);
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

  const username = ref('');
  if (process.client) {
    const usernameCookie = useCookie('un-join-username').value;
    !usernameCookie
      ? navigateTo('/join')
      : (username.value = usernameCookie || '');
  }

  const formValid = computed(() => {
    if (secureType.value === 'passkey') {
      return true;
    }
    if (secureType.value === 'password') {
      return (
        passwordStats.value?.allowed === true &&
        passwordConfirmationValid.value === true
      );
    }
    return null;
  });

  // Password Form Fields
  const secureType = ref<'passkey' | 'password'>('passkey');
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

  watch(passwordInput, () => {
    passwordStats.value.allowed = null;
  });

  watchDebounced(
    passwordInput,
    async () => {
      if (passwordInput.value === '') return;

      const res = await $trpc.auth.signup.checkPasswordStrength.query({
        password: passwordInput.value
      });

      passwordStats.value = res;
    },
    {
      debounce: 750,
      maxWait: 10000
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
      debounce: 750,
      maxWait: 10000
    }
  );

  //functions

  function switchSecureType(type: 'passkey' | 'password') {
    if (buttonLoading.value === true) return;
    secureType.value = type;
  }

  const toast = useToast();
  async function createAccount() {
    if (!accountCreated.value) {
      buttonLoading.value = true;
      buttonLabel.value = 'Creating your account';
    }

    accountCreated.value = true;

    if (secureType.value === 'password') {
      const signUp = await $trpc.auth.password.signUpWithPassword.mutate({
        username: username.value,
        password: passwordInput.value
      });

      if (!signUp.success) {
        toast.add({
          id: 'sign_up_password_error',
          title: 'Sign up Error',
          description:
            'Something went wrong when signing Up, please try again.',
          color: 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
        pageError.value = true;
        buttonLoading.value = false;
        buttonLabel.value = 'Retry';
        return;
      }
      passwordCreated.value = true;
      toast.add({
        title: 'Account created',
        description:
          'Your account has been created, welcome to UnInbox!<br />You will now be redirected to set up Two Factor Authentication.',
        color: 'green',
        timeout: 5000,
        icon: 'i-ph-check-circle'
      });
    }

    if (secureType.value === 'passkey') {
      // get passkey options for new user
      const { options, publicId } =
        await $trpc.auth.passkey.signUpWithPasskeyStart.query({
          username: username.value,
          authenticatorType: passkeyType
        });
      // start registration

      let newPasskeyData: RegistrationResponseJSON;
      try {
        newPasskeyData = await startRegistration(options);
      } catch (error: any) {
        toast.add({
          id: 'passkey_error',
          title: 'Passkey error',
          description:
            error.name === 'NotAllowedError'
              ? 'Passkey operation was either cancelled or timed out'
              : 'Something went wrong when creating your passkey, please try again or switch to password mode.',
          color: error.name === 'NotAllowedError' ? 'yellow' : 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
        buttonLoading.value = false;
        buttonLabel.value = 'Try Again!';
        return;
      }

      toast.add({
        title: 'Passkey Created',
        description:
          'Your passkey has been created. Please wait for a few seconds while we create your account',
        color: 'green',
        timeout: 5000,
        icon: 'i-ph-check-circle'
      });

      const verifyNewPasskey =
        await $trpc.auth.passkey.signUpWithPasskeyFinish.mutate({
          username: username.value,
          publicId,
          registrationResponseRaw: newPasskeyData,
          nickname: 'Primary'
        });

      if (!verifyNewPasskey.success) {
        toast.add({
          id: 'passkey_error',
          title: 'Passkey error',
          description:
            'Something went while Signing Up with Passkeys, please try again or switch to password mode.',
          color: 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
        buttonLoading.value = false;
        buttonLabel.value = 'Try Again!';
        return;
      }
      passkeyCreated.value = true;
      toast.add({
        title: 'Account created',
        description:
          'Your account has been created, welcome to UnInbox!<br />You will now be redirected to your organization setup.',
        color: 'green',
        timeout: 5000,
        icon: 'i-ph-check-circle'
      });
    }

    navigateTo(secureType.value === 'passkey' ? '/join/org' : '/join/2fa');
  }

  const pageReady: Ref<boolean> = ref(false);
  onNuxtReady(() => {
    pageReady.value = true;
  });
</script>

<template>
  <div class="flex h-full w-full flex-col items-center justify-between p-4">
    <div
      class="flex w-full max-w-xl grow flex-col items-center justify-center gap-8 pb-14">
      <h1 class="flex flex-col gap-2 text-center">
        <span class="text-2xl font-medium leading-none">Let's make your</span>
        <span class="font-display text-5xl leading-none">UnInbox</span>
      </h1>
      <h2 class="text-center text-xl font-semibold">
        Secure your account {{ username }}
      </h2>
      <div class="flex w-full flex-row justify-stretch gap-2">
        <UnUiTooltip
          text="Choose your username"
          class="w-full">
          <div class="bg-base-5 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          class="w-full">
          <div class="bg-base-9 h-2 w-full rounded" />
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

      <div class="flex w-full flex-col gap-4">
        <p class="">How do you want to secure your account?</p>
        <div class="flex w-full gap-4">
          <button
            class="bg-base-3 row-span-4 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 p-4 md:col-span-4"
            :class="
              secureType === 'passkey' ? 'border-green-9' : 'border-base-4'
            "
            @click="switchSecureType('passkey')">
            <UnUiIcon
              name="i-mdi-fingerprint"
              class="text-base-9 text-5xl" />
            <p class="font-medium">Passkey</p>
            <p class="text-balance text-sm">Fingerprint, Face ID, etc</p>
            <UnUiBadge
              label="Most Secure"
              color="green" />
          </button>
          <button
            class="bg-base-3 row-span-4 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 p-4 md:col-span-4"
            :class="
              secureType === 'password' ? 'border-green-9' : 'border-base-4'
            "
            @click="switchSecureType('password')">
            <UnUiIcon
              name="i-ph-password-light"
              class="text-base-9 text-5xl" />
            <p class="font-medium">Password</p>
            <p class="text-sm">Alphanumeric</p>
            <UnUiBadge
              label="Less Secure"
              color="amber" />
          </button>
        </div>
      </div>
      <div
        v-if="secureType === 'passkey'"
        class="flex w-full flex-col items-center justify-center gap-4">
        <div>
          <span class="font-semibold">What are passkeys?</span>
          <p class="text-balance">
            Passkeys are the new replacement for passwords, designed to give you
            access to an app in an easier and more secure way.
          </p>
        </div>
        <div class="lt-md:grid-rows-2 grid w-full gap-2 md:grid-cols-2">
          <UnUiButton
            label="How do they work"
            icon="i-mdi-information-variant"
            variant="outline"
            size="sm"
            color="green"
            block
            @click="howToAddPasskeyDialogOpen = true" />
          <UnUiButton
            label="How do I add a passkey?"
            icon="i-mdi-help"
            variant="outline"
            size="sm"
            color="amber"
            block
            @click="howToAddPasskeyDialogOpen = true" />
        </div>
      </div>
      <div
        v-if="secureType === 'password'"
        class="flex w-full flex-col items-center justify-center">
        <form class="mx-auto flex w-full flex-col gap-2 px-4 md:w-3/4">
          <UnUiInput
            v-model:value="passwordInput"
            :valid="passwordStats.allowed"
            width="full"
            icon="i-ph-password"
            label="Password"
            password
            placeholder="" />
          <div v-if="passwordInput !== '' && passwordStats.allowed !== null">
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
                :name="
                  passwordStats.score && passwordStats.score >= 3
                    ? 'i-mdi-check-circle'
                    : 'i-mdi-close-circle'
                "
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
        </form>
      </div>
      <div class="mt-3 w-full">
        <UnUiButton
          :label="buttonLabel"
          icon="i-ph-key"
          :loading="buttonLoading"
          :disabled="!formValid"
          block
          @click="
            createAccount().finally(() => {
              buttonLoading = false;
            })
          " />
      </div>
      <p
        v-if="pageError"
        class="bg-red-9 w-full rounded p-4 text-center">
        Something went wrong, please try again or contact our support team if it
        persists
      </p>
      <p class="text-gray-12 text-center text-sm font-medium">
        Tip: If you have any issues during this process, reach out to our
        support team
      </p>
      <div class="h-0 max-h-0 w-full max-w-full"></div>
    </div>
    <UnUiModal
      v-model="howToAddPasskeyDialogOpen"
      title="How to add a passkey?">
      <template #header>
        <div class="flex items-center justify-between">
          <p>How to add a passkey?</p>
        </div>
      </template>
      <div class="flex w-full flex-col items-center gap-4">
        <p
          v-if="instructionSet === ''"
          class="text-center">
          The easiest way is with your mobile phone. <br />It will be backed-up
          to sign in on multiple devices. <br />
          Select your mobile system below to see the instructions.
        </p>
        <div
          class="lt-md:grid-rows-2 grid w-full justify-items-stretch gap-2 md:grid-cols-2">
          <button
            class="border-primary-7 hover:bg-primary-4 h-24 grow rounded border px-4 text-xl"
            :class="instructionSet === 'ios' ? 'bg-primary-5' : 'bg-primary-2'"
            @click="instructionSet = 'ios'">
            <UnUiIcon
              name="i-ph-apple-logo-fill"
              class="mr-2 mt-[-6px]" />iOS
          </button>
          <button
            class="border-primary-7 hover:bg-primary-4 h-24 rounded border px-4 text-xl"
            :class="
              instructionSet === 'android' ? 'bg-primary-5' : 'bg-primary-2'
            "
            @click="instructionSet = 'android'">
            <UnUiIcon
              name="i-ph-android-logo-fill"
              class="mr-2 mt-[-6px]" />Android
          </button>
        </div>
        <ol
          v-if="instructionSet === 'ios'"
          class="">
          <li>
            Click the <span class="font-mono text-sm">"Create my passkey"</span>
            button below
          </li>
          <li>The browser will ask where to save the passkey</li>
          <li>
            Select
            <span class="font-mono text-sm">"Use a phone or tablet"</span>
          </li>
          <li>
            Using the built-in iOS camera app to scan the QR barcode thats
            displayed
          </li>
          <li>
            Tap the small
            <span class="font-mono text-sm">"Save a passkey"</span> message that
            appears on screen
          </li>
        </ol>
        <ol v-if="instructionSet === 'android'">
          <li>
            Download and install the official "Google Lens" app from the
            playStore.
          </li>
          <li>
            Click the
            <span class="font-mono">"Create my passkey"</span> button below
          </li>
          <li>The browser will ask you where to save the passkey</li>
          <li>
            Select
            <span class="font-mono">"Use a phone or tablet"</span>
          </li>
          <li>
            Use the Google Lens app to scan the QR barcode thats displayed.
          </li>
          <li>
            Within the camera app view, tap the small "Save a passkey" message
            that appears at the bottom.
          </li>
        </ol>
      </div>
      <template #footer>
        <UnUiButton
          label="Ok, I'm ready"
          icon="i-ph-thumbs-up"
          color="green"
          block
          @click="howToAddPasskeyDialogOpen = false" />
      </template>
    </UnUiModal>
  </div>
</template>
