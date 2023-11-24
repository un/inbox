<script setup lang="ts">
  const { $trpc, $i18n } = useNuxtApp();

  // onMounted(async () => {
  //   await createNewPersonalOrg();
  // });
  // async function createNewPersonalOrg() {
  //   buttonLoading.value = true;
  //   const createNewPersonalOrgResponse =
  //     await $trpc.org.crud.createPersonalOrg.mutate({});
  //   if (!createNewPersonalOrgResponse.success) {
  //     pageError.value = true;
  //     buttonLabel.value = 'Take me to my account anyway!';
  //     buttonLoading.value = false;
  //   }
  //   if (createNewPersonalOrgResponse.success) {
  //     userEmail.value = createNewPersonalOrgResponse.email || '';
  //     statusReady.value = true;
  //     buttonLabel.value = 'Take me to my account';
  //     buttonLoading.value = false;
  //   }
  // }
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
          We dont have a full <span class="line-through">on</span>unboading
          <span class="font-bold">yet</span>,<br />so here's a short video to
          help you get started.
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

      <UnUiButton
        label="Take me to my account"
        icon="i-ph-thumbs-up"
        block
        @click="navigateTo('/login')" />
    </div>
  </div>
</template>
