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

    navigateTo('/join/profile');
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
  <div class="flex flex-col w-screen h-screen items-center justify-between p-4">
    <div
      class="flex flex-col max-w-72 md:max-w-xl items-center justify-center gap-8 w-full grow pb-14">
      <h1 class="font-display text-2xl text-center mb-4">
        Let's make your <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <h2 class="font-semibold text-xl text-center">
        Secure your account {{ username }}
      </h2>
      <div class="flex flex-row gap-2 w-full justify-stretch">
        <UnUiTooltip
          text="Choose your username"
          parentClass="w-full">
          <div
            class="h-2 bg-primary-6 rounded w-full"
            @click="navigateTo('/join')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          parentClass="w-full">
          <div
            class="h-2 bg-primary-9 w-full rounded"
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
        <p class="text-center">Forget passwords, we use passkeys.</p>
        <p class="text-center">
          Passkeys are a next-generation account security flow that's making the
          world more secure.
        </p>
      </div>
      <div class="grid lt-md:grid-rows-2 md:grid-cols-2 gap-2 w-full">
        <UnUiButton
          label="Tell me about passkeys"
          icon="mdi-information-variant"
          variant="soft"
          size="sm"
          color="green"
          width="full"
          @click="howToAddPasskeyDialogOpen = true" />
        <UnUiButton
          label="How do I add a passkey?"
          icon="mdi-help"
          variant="soft"
          size="sm"
          color="orange"
          width="full"
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
        :remoteValidation="true"
        :schema="z.string().email()" />

      <div class="mt-3 w-full">
        <UnUiButton
          :label="buttonLabel"
          icon="ph-key"
          :loading="buttonLoading"
          :disabled="!formValid"
          width="full"
          @click="createAccount()" />
      </div>
      <p
        v-if="pageError"
        class="p-4 w-full text-center rounded bg-red-9">
        Something went wrong, please try again or contact our support team if it
        persists
      </p>
      <p class="text-center text-sm">
        tip: if you have any issues during this process, reach out to our
        support team
      </p>
      <ClientOnly>
        <NuxtTurnstile
          v-model="turnstileToken"
          class="fixed bottom-5 scale-50 mb-[-30px] hover:(scale-100 mb-0)" />
      </ClientOnly>
    </div>
    <UnUiDialog
      v-model:isOpen="howToAddPasskeyDialogOpen"
      :hasCloseButton="true"
      title="How to add a passkey?">
      <div class="flex flex-col gap-4 items-center w-full">
        <p
          v-if="instructionSet === ''"
          class="text-center">
          The easiest way is with your mobile phone. <br />It will be backed-up
          to sign in on multiple devices. <br />
          Select your mobile system below to see the instructions.
        </p>
        <div
          class="grid lt-md:grid-rows-2 md:grid-cols-2 justify-items-stretch gap-2 w-full">
          <button
            class="h-24 hover:bg-primary-4 border border-primary-7 px-4 rounded text-xl grow"
            :class="instructionSet === 'ios' ? 'bg-primary-5' : 'bg-primary-2'"
            @click="instructionSet = 'ios'">
            <Icon
              name="ph-apple-logo-fill"
              class="mt-[-6px] mr-2" />iOS
          </button>
          <button
            class="h-24 hover:bg-primary-4 border border-primary-7 px-4 rounded text-xl"
            :class="
              instructionSet === 'android' ? 'bg-primary-5' : 'bg-primary-2'
            "
            @click="instructionSet = 'android'">
            <Icon
              name="ph-android-logo-fill"
              class="mt-[-6px] mr-2" />Android
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
        <UnUiButton
          label="Ok, I'm ready"
          icon="ph-thumbs-up"
          variant="soft"
          color="green"
          @click="howToAddPasskeyDialogOpen = false" />
      </div>
    </UnUiDialog>
  </div>
</template>
