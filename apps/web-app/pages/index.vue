<script setup lang="ts">
  definePageMeta({ skipAuth: true });

  const turnstileToken = ref();
  const errorMessage = ref(false);
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

  async function doLogin() {
    if (!turnstileToken.value) {
      errorMessage.value = true;
      return;
    }
    if (!immediatePasskeyPrompt.value) {
      passkeyLocationDialogOpen.value = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        promptForPasskey();
      }, 10000);
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
      errorMessage.value = true;
      return;
    }
    console.log(webauthnResult);
    webauthnResult && navigateTo('/h');
  }
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
        variant="soft"
        block
        size="lg"
        @click="navigateTo('/join')" />
      <NuxtLink
        to="/login/findmypasskey"
        class="text-center text-sm hover:(text-primary-11 underline)">
        I lost my passkey
      </NuxtLink>
      <div class="h-0 max-h-0 max-w-full w-full">
        <UnUiAlert
          v-show="errorMessage"
          icon="i-ph-warning-circle"
          title="Human verification failed!"
          description="Try refreshing the page or contact our amazing support team"
          color="red"
          variant="solid" />
      </div>

      <NuxtTurnstile
        v-model="turnstileToken"
        class="fixed bottom-5 mb-[-30px] scale-50 hover:(mb-0 scale-100)" />
    </div>
    <UnUiModal v-model="passkeyLocationDialogOpen">
      <template #header>
        <div class="flex items-center justify-end">
          <UnUiButton
            color="gray"
            variant="ghost"
            icon="i-ph-x"
            class="-my-1"
            @click="passkeyLocationDialogOpen = false" />
        </div>
      </template>

      <div class="w-full flex flex-col gap-4 p-4">
        <p v-if="passkeyLocation">
          Tip: You last saved a passkey in this browser called
          <span class="font-bold text-primary-11">{{ passkeyLocation }}</span>
        </p>
        <p v-if="!passkeyLocation">
          It looks like you haven't used a passkey in this browser yet.<br />
          Try using your phone to scan a QR code or check your password
          manager.<br />
        </p>
      </div>
      <template #footer>
        <div class="w-full flex flex-col gap-4 md:flex-row">
          <UnUiButton
            label="Help me find my passkey"
            variant="outline"
            size="sm"
            @click="navigateTo('/login/findmypasskey')" />
          <UnUiButton
            label="I'm ready now"
            size="sm"
            @click="promptForPasskey()" />
        </div>
      </template>
    </UnUiModal>
  </div>
</template>
