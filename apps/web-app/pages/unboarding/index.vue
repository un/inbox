<script setup lang="ts">
  import { navigateTo } from '#imports';
</script>

<template>
  <div class="flex h-screen w-screen flex-col items-center justify-between p-4">
    <div
      class="flex w-full max-w-72 grow flex-col items-center justify-center gap-8 pb-14 md:max-w-xl">
      <h1 class="font-display mb-4 text-center text-2xl">
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
      <span class="font-display text-xl"
        >Ooops! The video is still being produced, check the user guide
        instead.</span
      >

      <UnUiButton
        label="Visit user guide"
        icon="i-ph-question"
        block
        @click="
          navigateTo('https://guide.uninbox.com', {
            external: true,
            open: { target: '_blank' }
          })
        " />
      <UnUiButton
        label="Take me to my account"
        icon="i-ph-thumbs-up"
        block
        @click="navigateTo('/redirect')" />
    </div>
  </div>
</template>
