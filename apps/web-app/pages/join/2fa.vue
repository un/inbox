<script setup lang="ts">
  import { navigateTo } from '#imports';
</script>

<template>
  <div class="flex h-full w-full flex-col items-center justify-between p-4">
    <div
      class="flex w-full max-w-72 grow flex-col items-center justify-center gap-8 pb-14 md:max-w-xl">
      <h1 class="mb-4 flex flex-col gap-2 text-center">
        <span class="text-2xl font-medium leading-none">Let's make your</span>
        <span class="font-display text-5xl leading-none">UnInbox</span>
      </h1>
      <h2 class="text-center text-xl font-semibold">
        Secure your account with two factor authentication
      </h2>
      <div class="flex w-full flex-row justify-stretch gap-2">
        <UnUiTooltip
          text="Choose your username"
          class="w-full">
          <div class="bg-base-5 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          class="w-full">
          <div class="bg-base-9 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
          class="w-full">
          <div class="bg-base-5 h-2 w-full rounded" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Create your profile"
          class="w-full">
          <div class="bg-base-5 h-2 w-full rounded" />
        </UnUiTooltip>
      </div>
      <div class="flex flex-col gap-2">
        <span>
          Signing in with a password requires setting up two factor
          authentication.
        </span>
        <span>
          Each time you sign in, you'll need to provide the automatically
          generated code.
        </span>
      </div>
      <SettingsAddTotp @complete="navigateTo('/join/org')" />
    </div>
  </div>
</template>
