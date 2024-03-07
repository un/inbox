<script setup lang="ts">
  import { startRegistration } from '@simplewebauthn/browser';
  import type { RegistrationResponseJSON } from '@simplewebauthn/types';
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();
  definePageMeta({ guest: true });
  const turnstileToken = ref();
  const buttonLoading = ref(false);
  const buttonLabel = ref('Create my account');
  const howToAddPasskeyDialogOpen = ref(false);
  const instructionSet = ref<'ios' | 'android' | ''>('');
  const pageError = ref(false);
  const turnstileError = ref(false);

  const userCreated = ref(false);
  const passkeyCreated = ref(false);
  const passwordCreated = ref(false);
  // check if the users device can directly support passkeys
  const passkeyType =
    (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
      ? 'platform'
      : 'cross-platform';

  const turnstileEnabled = useRuntimeConfig().public.turnstileEnabled;
  if (!turnstileEnabled) {
    turnstileToken.value = '';
  }

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
        passwordValid.value === true && passwordConfirmationValid.value === true
      );
    }
  });

  // Password Form Fields
  const secureType = ref<'passkey' | 'password'>('passkey');
  const passwordInput = ref('');
  const passwordValid = ref<boolean | null>(null);
  const passwordValidationMessage = ref('');
  const passwordConfirmationInput = ref('');
  const passwordConfirmationValid = ref<boolean | null>(null);
  const passwordConfirmationValidationMessage = ref('');

  const passwordConditionLengthValid = computed(() => {
    const schema = z.string().min(8);
    return schema.safeParse(passwordInput.value).success;
  });
  const passwordConditionDigitValid = computed(() => {
    const schema = z.string().regex(/(?=.*\d)/);
    return schema.safeParse(passwordInput.value).success;
  });
  const passwordConditionLowercaseValid = computed(() => {
    const schema = z.string().regex(/(?=.*[a-z])/);
    return schema.safeParse(passwordInput.value).success;
  });
  const passwordConditionUppercaseValid = computed(() => {
    const schema = z.string().regex(/(?=.*[A-Z])/);
    return schema.safeParse(passwordInput.value).success;
  });
  const passwordConditionSpecialCharValid = computed(() => {
    const schema = z
      .string()
      .regex(/(?=.*[ !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~])/);
    return schema.safeParse(passwordInput.value).success;
  });
  const passwordConditionNoWhitespaceValid = computed(() => {
    const schema = z.string().regex(/(?!.*\s)/);
    return schema.safeParse(passwordInput.value).success;
  });

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

  function switchSecureType(type: 'passkey' | 'password') {
    if (buttonLoading.value === true) return;
    secureType.value = type;
  }

  const toast = useToast();
  async function createUserAccount() {
    if (!userCreated.value) {
      if (turnstileEnabled && turnstileToken.value === null) {
        turnstileError.value = true;
        await new Promise((resolve) => {
          const unwatch = watch(turnstileToken, (newValue) => {
            if (newValue !== null) {
              resolve(newValue);
              unwatch();
              turnstileError.value = false;
            }
          });
        });
      }

      buttonLoading.value = true;
      buttonLabel.value = 'Creating your account';
    }

    userCreated.value = true;

    if (secureType.value === 'password') {
      const signUp = await $trpc.auth.password.signUpWithPassword.mutate({
        username: username.value,
        password: passwordInput.value,
        turnstileToken: turnstileToken.value
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
    }

    if (secureType.value === 'passkey') {
      // get passkey options for new user
      const { options, publicId } =
        await $trpc.auth.passkey.signUpWithPasskeyStart.query({
          username: username.value,
          turnstileToken: turnstileToken.value,
          authenticatorType: passkeyType
        });
      // start registration

      let newPasskeyData: RegistrationResponseJSON;
      try {
        newPasskeyData = await startRegistration(options);
      } catch (error) {
        toast.add({
          id: 'passkey_error',
          title: 'Passkey error',
          description:
            'Something went wrong when creating your passkey, please try again or switch to password mode.',
          color: 'red',
          timeout: 5000,
          icon: 'i-ph-warning-circle'
        });
        buttonLoading.value = false;
        buttonLabel.value = 'Try Again!';
        return;
      }
      const verifyNewPasskey =
        await $trpc.auth.passkey.signUpWithPasskeyFinish.query({
          username: username.value,
          turnstileToken: turnstileToken.value,
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
    }

    toast.add({
      title: 'Account created',
      description:
        'Your account has been created, welcome to UnInbox!<br />You will now be redirected to your organization setup.',
      color: 'green',
      timeout: 5000,
      icon: 'i-ph-check-circle'
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    navigateTo(secureType.value === 'passkey' ? '/join/org' : '/join/2fa');
  }

  const pageReady: Ref<boolean> = ref(false);
  onNuxtReady(() => {
    pageReady.value = true;
  });
</script>

<template>
  <div class="flex h-screen w-full flex-col items-center justify-between p-4">
    <div
      class="flex w-full max-w-72 grow flex-col items-center justify-center gap-8 pb-14 md:max-w-xl">
      <h1 class="font-display mb-4 text-center text-2xl">
        Let's make your <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <h2 class="text-center text-xl font-semibold">
        Secure your account {{ username }}
      </h2>
      <div class="flex w-full flex-row justify-stretch gap-2">
        <UnUiTooltip
          text="Choose your username"
          class="w-full">
          <div
            class="bg-primary-400 h-2 w-full rounded"
            @click="navigateTo('/join')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          class="w-full">
          <div
            class="bg-primary-600 h-2 w-full rounded"
            @click="navigateTo('/join/secure')" />
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

      <div class="flex w-full flex-col gap-4">
        <p class="">How do you want to secure your account?</p>
        <div class="grid w-full grid-cols-9 justify-items-center gap-8">
          <button
            class="col-span-4 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 bg-gray-50 p-4 dark:bg-gray-800"
            :class="
              secureType === 'passkey'
                ? 'border-green-500'
                : 'border-gray-200 dark:border-gray-700'
            "
            @click="switchSecureType('passkey')">
            <UnUiIcon
              name="i-mdi-fingerprint"
              class="text-5xl text-gray-500" />
            <p class="font-medium">Passkey</p>
            <p class="text-sm">Fingerprint, Face ID, etc</p>
            <UnUiBadge
              label="Most Secure"
              color="green" />
          </button>
          <UnUiDivider
            label="OR"
            orientation="vertical"
            class="w-fit" />
          <button
            class="col-span-4 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 bg-gray-50 p-4 dark:bg-gray-800"
            :class="
              secureType === 'password'
                ? 'border-green-500'
                : 'border-gray-200 dark:border-gray-700'
            "
            @click="switchSecureType('password')">
            <UnUiIcon
              name="i-ph-password-light"
              class="text-5xl text-gray-500" />
            <p class="font-medium">Password</p>
            <p class="text-sm">Alphanumeric!1</p>
            <UnUiBadge
              label="Less Secure"
              color="orange" />
          </button>
        </div>
      </div>
      <div
        v-if="secureType === 'passkey'"
        class="flex w-full flex-col gap-4">
        <div>
          <span class="font-semibold">What are passkeys?</span>
          <p class="">
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
            color="orange"
            block
            @click="howToAddPasskeyDialogOpen = true" />
        </div>
      </div>
      <div
        v-if="secureType === 'password'"
        class="w-full">
        <div class="grid grid-cols-2 gap-8">
          <div class="flex flex-col gap-2">
            <UnUiInput
              v-model:value="passwordInput"
              v-model:valid="passwordValid"
              v-model:validationMessage="passwordValidationMessage"
              width="full"
              icon="i-ph-password"
              label="Password"
              password
              placeholder=""
              :schema="
                z
                  .string()
                  .min(8, { message: 'Minimum 8 characters' })
                  .max(64)
                  .regex(
                    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.*\s).{8,}$/,
                    {
                      message:
                        'At least one digit, one lowercase letter, one uppercase letter, one special character, no whitespace allowed, minimum eight characters in length'
                    }
                  )
              " />
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
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-sm"> Your password must be: </span>
            <div class="flex flex-row items-center gap-1">
              <UnUiIcon
                name="i-ph-check-circle-fill"
                :class="
                  passwordConditionLengthValid
                    ? 'text-green-500'
                    : 'text-red-500'
                " />
              <span
                class="text-sm leading-none text-gray-800 dark:text-gray-200">
                at least 8 characters long
              </span>
            </div>
            <div class="flex flex-row items-center gap-1">
              <UnUiIcon
                name="i-ph-check-circle-fill"
                :class="
                  passwordConditionDigitValid
                    ? 'text-green-500'
                    : 'text-red-500'
                " />
              <span
                class="text-sm leading-none text-gray-800 dark:text-gray-200">
                include 1 number
              </span>
            </div>
            <div class="flex flex-row items-center gap-1">
              <UnUiIcon
                name="i-ph-check-circle-fill"
                :class="
                  passwordConditionLowercaseValid
                    ? 'text-green-500'
                    : 'text-red-500'
                " />
              <span
                class="text-sm leading-none text-gray-800 dark:text-gray-200">
                include 1 lowercase letter
              </span>
            </div>
            <div class="flex flex-row items-center gap-1">
              <UnUiIcon
                name="i-ph-check-circle-fill"
                :class="
                  passwordConditionUppercaseValid
                    ? 'text-green-500'
                    : 'text-red-500'
                " />
              <span
                class="text-sm leading-none text-gray-800 dark:text-gray-200">
                include 1 uppercase letter
              </span>
            </div>
            <div class="flex flex-row items-center gap-1">
              <UnUiIcon
                name="i-ph-check-circle-fill"
                :class="
                  passwordConditionSpecialCharValid
                    ? 'text-green-500'
                    : 'text-red-500'
                " />
              <span
                class="text-sm leading-none text-gray-800 dark:text-gray-200">
                include 1 special character
              </span>
            </div>
            <div
              v-if="!passwordConditionNoWhitespaceValid"
              class="flex flex-row gap-2">
              <UnUiIcon
                name="i-ph-check-circle-fill"
                :class="
                  passwordConditionNoWhitespaceValid
                    ? 'text-green-500'
                    : 'text-red-500'
                " />
              <span
                class="text-sm leading-none text-gray-800 dark:text-gray-200">
                include no whitespaces
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-3 w-full">
        <UnUiButton
          :label="buttonLabel"
          icon="i-ph-key"
          :loading="buttonLoading"
          :disabled="!formValid"
          block
          @click="createUserAccount()" />
      </div>
      <p
        v-if="pageError"
        class="bg-red-9 w-full rounded p-4 text-center">
        Something went wrong, please try again or contact our support team if it
        persists
      </p>
      <p class="text-center text-sm">
        tip: if you have any issues during this process, reach out to our
        support team
      </p>
      <div class="h-0 max-h-0 w-full max-w-full">
        <UnUiAlert
          v-show="turnstileError"
          icon="i-ph-warning-circle"
          title="Waiting for human verification!"
          description="This is an automated process and should complete within a few seconds. If it doesn't, please refresh the page."
          color="orange"
          variant="solid" />
      </div>

      <NuxtTurnstile
        v-if="pageReady && turnstileEnabled"
        v-model="turnstileToken"
        class="hover:(mb-0 scale-100) fixed bottom-5 mb-[-30px] scale-50" />
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
