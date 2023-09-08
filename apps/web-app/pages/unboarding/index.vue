<script setup lang="ts"></script>

<template>
  <div class="h-screen w-screen flex flex-col items-center justify-between p-4">
    <div
      class="max-w-72 w-full flex grow flex-col items-center justify-center gap-8 pb-14 md:max-w-xl">
      <h1 class="mb-4 text-center text-2xl font-display">
        Welcome to <br /><span class="text-5xl">UnInbox</span>
      </h1>

      <div class="flex flex-col gap-2">
        <p class="text-center">Here's a short video to help you get started.</p>
        <p class="text-center">
          We dont have a full <span class="line-through">on</span>unboading
          <span class="font-bold">yet</span>,<br />so watching the video will
          really help get started.
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
        icon="ph-thumbs-up"
        width="full"
        @click="navigateTo('/h')" />
    </div>
  </div>
</template>
