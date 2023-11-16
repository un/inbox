<script setup lang="ts">
  const { $trpc, $i18n } = useNuxtApp();

  const statusReady = ref(false);
  const userEmail = ref('');
  const pageError = ref(false);
  const buttonLabel = ref('Creating your account');
  const buttonLoading = ref(false);

  onMounted(async () => {
    await createNewPersonalOrg();
  });
  async function createNewPersonalOrg() {
    buttonLoading.value = true;
    const createNewPersonalOrgResponse =
      await $trpc.org.crud.createPersonalOrg.mutate({});
    if (!createNewPersonalOrgResponse.success) {
      pageError.value = true;
      buttonLabel.value = 'Take me to my account anyway!';
      buttonLoading.value = false;
    }
    if (createNewPersonalOrgResponse.success) {
      userEmail.value = createNewPersonalOrgResponse.email || '';
      statusReady.value = true;
      buttonLabel.value = 'Take me to my account';
      buttonLoading.value = false;
    }
  }
</script>

<template>
  <div class="h-screen w-screen flex flex-col items-center justify-between p-4">
    <div
      class="max-w-72 w-full flex grow flex-col items-center justify-center gap-8 pb-14 md:max-w-xl">
      <h1 class="mb-4 text-center text-2xl font-display">
        Welcome to <br /><span class="text-5xl">UnInbox</span>
      </h1>

      <div class="flex flex-col gap-2">
        <p class="text-center">
          We're setting you up with a free @uninbox email address.
        </p>
        <p class="text-center">
          Here's a short video to help you get started while we create your
          account.
        </p>
        <p class="text-center">
          We dont have a full <span class="line-through">on</span>unboading
          <span class="font-bold">yet</span>,<br />so the video will help you
          get started.
        </p>
        <p class="text-center">
          Give us a shout if you run into any issues, we're here to help!
        </p>
      </div>

      <!-- !!! REPLACE VIDEO -->
      <iframe
        title="UnInbox Unboarding Video"
        class="aspect-video w-full"
        src="https://www.youtube.com/embed/6ZfuNTqbHE8"
        frameborder="0"
        allowfullscreen></iframe>
      <p
        v-if="statusReady"
        class="text-center">
        🎉 Your new email is ready:
        <span class="font-bold">{{ userEmail }}</span>
      </p>
      <UnUiAlert
        v-if="pageError"
        title="Uh oh!"
        color="red"
        icon="i-ph-warning-circle"
        description="Something went wrong, please try again or contact our support team if it
        persists" />
      <UnUiButton
        :label="buttonLabel"
        icon="i-ph-thumbs-up"
        block
        :loading="buttonLoading"
        @click="navigateTo('/h')" />
    </div>
  </div>
</template>
