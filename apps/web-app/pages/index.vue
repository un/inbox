<script setup lang="ts">
  definePageMeta({ auth: false });

  const turnstileToken = ref();
  const errorMessage = ref('');
  const passkeyLocation = ref('');
  const immediatePasskeyPrompt = ref(false);
  const passkeyLocationDialogOpen = ref(false);

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

  function resetTurnstileToken() {
    turnstileToken.value?.reset();
  }

  async function doLogin() {
    if (!turnstileToken.value) {
      errorMessage.value =
        'Human verification failed!<br/>Try refreshing the page or contact our amazing support team';
      return;
    }
    if (!immediatePasskeyPrompt.value) {
      passkeyLocationDialogOpen.value = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        promptForPasskey();
      }, 7000);
      return;
    }

    immediatePasskeyPrompt.value && promptForPasskey();
  }

  async function promptForPasskey() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    const webauthnResult = await useHanko()?.webauthn.login();
    if (!webauthnResult) {
      errorMessage.value =
        'Human verification failed!<br/>Try refreshing the page or contact our amazing support team';
      return;
    }
    webauthnResult && console.log(webauthnResult);
  }
</script>

<template>
  <div class="flex flex-col w-screen h-screen items-center justify-center p-4">
    <div
      class="flex flex-col max-w-72 md:max-w-80 items-center justify-center gap-4">
      <h1 class="font-display text-2xl text-center mb-4">
        Login to your <br /><span class="text-5xl">UnInbox</span>
      </h1>

      <UnUiButton
        label="Login with my passkey"
        icon="ph-key-duotone"
        width="full"
        @click="doLogin()" />
      <UnUiButton
        label="Not a member yet? Join instead"
        variant="outline"
        width="full"
        size="sm"
        @click="navigateTo('/join')" />
      <NuxtLink
        to="/login/findmypasskey"
        class="text-sm text-center hover:(underline text-primary-11)">
        I lost my passkey
      </NuxtLink>
      <div class="h-0 max-h-0 max-w-full">
        <p
          v-show="errorMessage"
          class="px-4 py-2 bg-red-9 text-primary-12 rounded text-center"
          v-html="errorMessage"></p>
      </div>

      <ClientOnly>
        <NuxtTurnstile
          v-model="turnstileToken"
          class="fixed bottom-5" />
      </ClientOnly>
    </div>
    <UnUiDialog
      v-model:isOpen="passkeyLocationDialogOpen"
      :hasCloseButton="true"
      title="Where's my passkey?">
      <p v-if="passkeyLocation">
        Tip: You last saved a passkey in this browser called
        <span class="font-bold text-primary-11">{{ passkeyLocation }}</span>
      </p>
      <p v-if="!passkeyLocation">
        It looks like you haven't used a passkey in this browser yet.<br />
        Try using your phone to scan a QR code or check your password
        manager.<br />
      </p>
      <div class="flex flex-col md:flex-row gap-4">
        <UnUiButton
          label="Help me find my passkey"
          variant="outline"
          width="full"
          size="sm"
          @click="navigateTo('/login/findmypasskey')" />
        <UnUiButton
          label="I'm ready now"
          width="full"
          size="sm"
          @click="promptForPasskey()" />
      </div>
      <UnUiCheckbox
        v-model:value="immediatePasskeyPrompt"
        label="Skip this prompt in the future" />
    </UnUiDialog>
  </div>
</template>
