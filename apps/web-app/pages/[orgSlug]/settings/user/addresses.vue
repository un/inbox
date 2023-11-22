<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';

  const { $trpc, $i18n } = useNuxtApp();
  const { copy, copied, text } = useClipboard();

  const {
    data: userAddresses,
    pending,
    error,
    refresh
  } = await $trpc.user.addresses.getPersonalAddresses.useLazyQuery(
    {},
    { server: false, queryKey: 'getUserAddresses' }
  );
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <span class="text-2xl font-display">Your Addresses</span>
    </div>

    <div
      v-if="pending"
      class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading your profiles</span>
    </div>

    <div
      v-if="!pending"
      class="w-full flex flex-col items-start justify-center gap-8 pb-14">
      <div class="flex flex-col gap-4">
        <span class="text-sm font-medium uppercase text-base-11">
          Personal email addresses
        </span>
        <span class="text-sm">
          You can use these email addresses to send and receive emails with the
          rest of the world.
        </span>
        <span class="text-sm">They are yours personally to keep forever.</span>
        <div
          v-for="personalEmail of userAddresses?.personalEmailAddresses"
          :key="personalEmail.username + personalEmail.domainName"
          class="flex flex-row items-center gap-2">
          <div
            class="min-w-[50px] w-fit flex flex-col items-center rounded-lg bg-base-3 p-4">
            <span class="w-fit break-anywhere text-left font-mono">
              {{ personalEmail.username }}@{{ personalEmail.domainName }}
            </span>
          </div>
          <UnUiTooltip text="Copy to clipboard">
            <UnUiIcon
              name="i-ph-clipboard"
              size="20"
              @click="
                copy(`${personalEmail.username}@${personalEmail.domainName}`)
              " />
          </UnUiTooltip>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <span class="text-sm font-medium uppercase text-base-11">
          Personal forwarding address
        </span>
        <span class="text-sm">
          Use this email address to forward in emails from another mail
          provider.
        </span>
        <span class="text-sm">
          Any emails forwarded to this address will be processed by your
          personal account.
        </span>
        <div class="flex flex-row items-center gap-2">
          <div
            class="min-w-[50px] w-fit flex flex-col items-center rounded-lg bg-base-3 p-4">
            <span class="w-fit break-anywhere text-left font-mono">
              {{ userAddresses?.personalOrgFwdAddress }}
            </span>
          </div>
          <UnUiTooltip text="Copy to clipboard">
            <UnUiIcon
              name="i-ph-clipboard"
              size="20"
              @click="copy(userAddresses?.personalOrgFwdAddress || '')" />
          </UnUiTooltip>
        </div>
      </div>
    </div>
  </div>
</template>
