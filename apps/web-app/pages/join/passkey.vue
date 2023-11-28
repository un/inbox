<script setup lang="ts">
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();
  definePageMeta({ skipAuth: true });

  const turnstileToken = ref();
  const buttonLoading = ref(false);
  const buttonLabel = ref('Create my passkey');
  const howToAddPasskeyDialogOpen = ref(false);
  const instructionSet = ref<'ios' | 'android' | ''>('');
  const userCreated = ref(false);
  const pageError = ref(false);

  const username = ref('');
  if (process.client) {
    const usernameCookie = useCookie('un-join-username').value;
    !usernameCookie
      ? navigateTo('/join')
      : (username.value = usernameCookie || '');
  }

  //Form Fields
  const emailValid = ref<boolean | 'remote' | null>(null);
  const emailValue = ref('');
  const emailValidationMessage = ref('');

  const formValid = computed(() => {
    return emailValid.value === true;
  });

  //functions
  async function createAccount() {
    buttonLoading.value = true;
    buttonLabel.value = 'Creating your account';
    //create the user in Hanko & db
    const response = await $trpc.signup.registerUser.mutate({
      turnstileToken: turnstileToken.value,
      username: username.value,
      email: emailValue.value
    });
    useCookie('un-join-userId').value = response.userPublicId;
    if (!response.userPublicId || response.error) {
      emailValidationMessage.value = response.error || 'Something went wrong';
      buttonLabel.value = 'Something went wrong';
      buttonLoading.value = false;
      pageError.value = true;
      return;
    }

    await useHanko()?.user.create(`${username.value}@uninbox.com`);

    await $trpc.signup.setUserAuthIdentity.mutate({
      turnstileToken: turnstileToken.value,
      userPublicId: response.userPublicId
    });

    await useHanko()?.webauthn.register();

    userCreated.value = true;
    buttonLoading.value = false;
    buttonLabel.value = 'All Done!';
    buttonLoading.value = false;

    //TODO: prompt the user to save the name of where they stored the passkey, store in DB, store in localstorage

    navigateTo('/join/org');
  }

  watchDebounced(
    emailValue,
    async () => {
      if (emailValid.value === 'remote') {
        const { validEmail } = await $trpc.signup.validateEmailAddress.query({
          turnstileToken: turnstileToken.value,
          email: emailValue.value
        });

        if (!validEmail) {
          emailValid.value = false;
          emailValidationMessage.value = 'Sorry, no temp email services';
        }
        validEmail && (emailValid.value = true);
      }
    },
    {
      debounce: 500,
      maxWait: 5000
    }
  );
</script>

<template>
  <div class="h-screen w-screen flex flex-col items-center justify-between p-4">
    <div
      class="max-w-72 w-full flex grow flex-col items-center justify-center gap-8 pb-14 md:max-w-xl">
      <h1 class="mb-4 text-center text-2xl font-display">
        Let's make your <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <h2 class="text-center text-xl font-semibold">
        Secure your account {{ username }}
      </h2>
      <div class="w-full flex flex-row justify-stretch gap-2">
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
            @click="navigateTo('/join/passkey')" />
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
        <p class="text-center">Forget passwords, we use passkeys.</p>
        <p class="text-center">
          Passkeys are a next-generation account security flow that's making the
          world more secure.
        </p>
      </div>
      <div class="grid w-full gap-2 lt-md:grid-rows-2 md:grid-cols-2">
        <UnUiButton
          label="Tell me about passkeys"
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
      <UnUiInput
        v-model:value="emailValue"
        v-model:valid="emailValid"
        v-model:validationMessage="emailValidationMessage"
        width="full"
        icon="ph:envelope"
        label="Recovery email address"
        helper="This email will only be used if you ever lose all your passkeys and need to recover your account or for important account notices."
        placeholder=""
        :remote-validation="true"
        :schema="z.string().email()" />

      <div class="mt-3 w-full">
        <UnUiButton
          :label="buttonLabel"
          icon="i-ph-key"
          :loading="buttonLoading"
          :disabled="!formValid"
          block
          @click="createAccount()" />
      </div>
      <p
        v-if="pageError"
        class="w-full rounded bg-red-9 p-4 text-center">
        Something went wrong, please try again or contact our support team if it
        persists
      </p>
      <p class="text-center text-sm">
        tip: if you have any issues during this process, reach out to our
        support team
      </p>

      <NuxtTurnstile
        v-model="turnstileToken"
        class="fixed bottom-5 mb-[-30px] scale-50 hover:(mb-0 scale-100)" />
    </div>
    <UnUiModal
      v-model="howToAddPasskeyDialogOpen"
      title="How to add a passkey?">
      <template #header>
        <div class="flex items-center justify-between">
          <p>How to add a passkey?</p>
          <UnUiButton
            color="gray"
            variant="ghost"
            icon="i-ph-x"
            class="-my-1"
            @click="howToAddPasskeyDialogOpen = false" />
        </div>
      </template>
      <div class="w-full flex flex-col items-center gap-4">
        <p
          v-if="instructionSet === ''"
          class="text-center">
          The easiest way is with your mobile phone. <br />It will be backed-up
          to sign in on multiple devices. <br />
          Select your mobile system below to see the instructions.
        </p>
        <div
          class="grid w-full justify-items-stretch gap-2 lt-md:grid-rows-2 md:grid-cols-2">
          <button
            class="h-24 grow border border-primary-7 rounded px-4 text-xl hover:bg-primary-4"
            :class="instructionSet === 'ios' ? 'bg-primary-5' : 'bg-primary-2'"
            @click="instructionSet = 'ios'">
            <UnUiIcon
              name="i-ph-apple-logo-fill"
              class="mr-2 mt-[-6px]" />iOS
          </button>
          <button
            class="h-24 border border-primary-7 rounded px-4 text-xl hover:bg-primary-4"
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
            Click the <span class="text-sm font-mono">"Create my passkey"</span>
            button below
          </li>
          <li>The browser will ask where to save the passkey</li>
          <li>
            Select
            <span class="text-sm font-mono">"Use a phone or tablet"</span>
          </li>
          <li>
            Using the built-in iOS camera app to scan the QR barcode thats
            displayed
          </li>
          <li>
            Tap the small
            <span class="text-sm font-mono">"Save a passkey"</span> message that
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
