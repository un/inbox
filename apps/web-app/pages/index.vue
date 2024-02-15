<script setup lang="ts">
  import { startAuthentication } from '@simplewebauthn/browser';
  const { $trpc, $i18n } = useNuxtApp();
  definePageMeta({ guest: true });
  const turnstileToken = ref();
  const errorMessage = ref(false);
  const passkeyLocation = ref('');
  const immediatePasskeyPrompt = ref(false);

  const turnstileEnabled = useRuntimeConfig().public.turnstileEnabled;
  if (!turnstileEnabled) {
    turnstileToken.value = '';
  }

  if (process.client) {
    passkeyLocation.value = localStorage.getItem('passkeyLocation') || '';
    immediatePasskeyPrompt.value = JSON.parse(
      localStorage.getItem('immediatePasskeyPrompt') || 'false'
    );
  }

  watch(immediatePasskeyPrompt, async () => {
    const newValue = JSON.stringify(immediatePasskeyPrompt.value);
    localStorage.setItem('immediatePasskeyPrompt', newValue);
  });
  let timeoutId: NodeJS.Timeout | null = null;

  async function doLogin() {
    if (turnstileEnabled && !turnstileToken.value) {
      errorMessage.value = true;

      await new Promise((resolve) => {
        const unwatch = watch(turnstileToken, (newValue) => {
          if (newValue !== null) {
            resolve(newValue);
            unwatch();
            errorMessage.value = false;
          }
        });
      });
    }

    await promptForPasskey();
  }

  async function promptForPasskey() {
    const toast = useToast();
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const passkeyOptions =
      await $trpc.auth.passkey.generatePasskeyChallenge.query({
        turnstileToken: turnstileToken.value
      });

    if (turnstileEnabled) {
      turnstileToken.value.reset();
    }

    if (!passkeyOptions.options) {
      toast.add({
        title: 'Server error',
        description:
          'We couldnt generate a secure login for you, please check your internet connection.',
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
      return;
    }
    try {
      const passkeyData = await startAuthentication(passkeyOptions.options);

      if (!passkeyData) {
        throw new Error('No passkey data returned');
      }

      console.log('passkeyData', { passkeyData });
      const verifyPasskey = await $trpc.auth.passkey.verifyPasskey.mutate({
        turnstileToken: turnstileToken.value,
        verificationResponseRaw: passkeyData
      });
      window.location.assign('/redirect');
    } catch (e) {
      toast.add({
        title: 'Passkey error',
        description:
          'Something went wrong when getting your passkey, please try again.',
        color: 'red',
        timeout: 5000,
        icon: 'i-ph-warning-circle'
      });
    }
  }

  const pageReady: Ref<boolean> = ref(false);
  onNuxtReady(() => {
    pageReady.value = true;
  });
</script>

<template>
  <div
    class="h-screen w-screen flex flex-col items-center justify-between p-4 pb-14">
    <div
      class="max-w-72 w-full flex grow flex-col items-center justify-center gap-8 pb-4 md:max-w-xl">
      <h1 class="mb-4 text-center text-2xl font-display">
        Login to your <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <UnUiButton
        label="Login with my passkey"
        icon="i-ph-key-duotone"
        block
        color="primary"
        size="lg"
        @click="doLogin()" />
      <UnUiButton
        label="Not a member yet? Join instead"
        variant="outline"
        block
        size="lg"
        @click="navigateTo('/join')" />
      <UnUiButton
        label="I lost my passkey"
        variant="ghost"
        block
        @click="navigateTo('/login/findmypasskey')" />
      <div class="h-0 max-h-0 max-w-full w-full">
        <UnUiAlert
          v-show="errorMessage"
          icon="i-ph-warning-circle"
          title="Waiting for human verification!"
          description="This is an automated process and should complete within a few seconds. If it doesn't, please refresh the page."
          color="orange"
          variant="solid" />
      </div>
      <NuxtTurnstile
        v-if="pageReady && turnstileEnabled"
        v-model="turnstileToken"
        class="fixed bottom-5 mb-[-30px] scale-50 hover:(mb-0 scale-100)" />
    </div>
  </div>
</template>
