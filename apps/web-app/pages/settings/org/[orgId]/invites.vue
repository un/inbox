<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();

  const showInviteModal = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Create invite');
  const pageError = ref(false);
  const inviteEmailValid = ref<boolean | 'remote' | null>(null);
  const inviteEmailValue = ref('');
  const inviteEmailValidationMessage = ref('');
  const newInviteCode = ref('');
  const formValid = computed(() => {
    return inviteEmailValid.value === true;
  });

  const orgPublicId = useRoute().params.orgId as string;

  const orgInviteQuery = await $trpc.org.invites.viewInvites.query({
    orgPublicId: orgPublicId
  });

  // remove invites that have a acceptedAt date
  const activeInvites = orgInviteQuery.invites.filter((invite) => {
    return invite.acceptedAt === null;
  });

  const expiredInvites = orgInviteQuery.invites.filter((invite) => {
    return invite.expiresAt
      ? invite.acceptedAt !== null || invite.expiresAt < new Date()
      : invite.acceptedAt !== null;
  });

  async function createInvite() {
    if (inviteEmailValid.value === false) return;
    buttonLoading.value = true;
    buttonLabel.value = 'Creating invite...';
    const newInviteResponse = await $trpc.org.invites.createNewInvite.mutate({
      orgPublicId: orgPublicId,
      inviteeEmail: inviteEmailValue.value,
      role: 'member'
    });

    // const invite = await $trpc.org.invites.createInvite.mutation({
    //   orgPublicId: orgPublicId,
    //   email: inviteEmailValue
    // });
    buttonLoading.value = false;
    buttonLabel.value = 'All done';
    inviteEmailValue.value = '';
    newInviteCode.value = newInviteResponse.inviteId;
    // TODO: re-fetch invites
  }
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Invites</span>
          <span class="text-sm">Manage your org invitations</span>
        </div>
      </div>
      <div class="flex flex-row gap-4 items-center">
        <button
          class="flex flex-row gap-2 p-2 border-1 rounded items-center justify-center border-base-7 bg-base-3 max-w-80"
          @click="showInviteModal = !showInviteModal">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">Invite</p>
        </button>
      </div>
    </div>
    <div
      v-if="!showInviteModal"
      class="flex flex-col w-full gap-4 justify-start">
      <span class="text-md font-semibold">Create a new invite</span>
      <div class="flex flex-row gap-8">
        <div class="flex flex-col w-full gap-4">
          <UnUiInput
            v-model:value="inviteEmailValue"
            v-model:valid="inviteEmailValid"
            v-model:validationMessage="inviteEmailValidationMessage"
            label="Email"
            placeholder=""
            :schema="z.string().email()" />
          <UnUiButton
            :label="buttonLabel"
            :loading="buttonLoading"
            :disabled="!formValid"
            size="sm"
            @click="createInvite()" />
        </div>
        <div
          class="w-full flex flex-col gap-0"
          v-if="newInviteCode">
          <span class="text-sm uppercase font-semibold text-base-11"
            >Invite Code</span
          >
          <div class="flex flex-row gap-4">
            <span class="font-mono">{{ newInviteCode }}</span>
            <button
              v-if="newInviteCode"
              class="flex flex-row gap-1 p-1 rounded items-center justify-center bg-base-3 hover:bg-base-4 text-xs"
              @click="copy(newInviteCode)">
              <!-- by default, `copied` will be reset in 1.5s -->
              <Icon
                name="ph-clipboard"
                size="16"
                :class="copied ? 'text-green-500' : 'text-base-11'" />
              <span v-if="!copied">Copy</span>
              <span v-else>Copied!</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-8 w-full overflow-y-scroll">
      <div class="flex flex-col gap-8 w-full">
        <span class="text-md font-semibold">Active Invites</span>
        <div
          v-if="activeInvites.length === 0"
          class="uppercase text-sm">
          No Active Invites
        </div>
        <SettingsInvitesItem
          v-for="invite of activeInvites"
          :inviteData="invite"
          :isExpired="false" />
      </div>
      <div class="flex flex-col gap-2 w-full">
        <span class="text-md font-semibold">Expired/used Invites</span>
        <div
          v-if="expiredInvites.length === 0"
          class="uppercase text-sm">
          No Expired/Used Invites
        </div>
        <SettingsInvitesItem
          v-for="invite of expiredInvites"
          :inviteData="invite"
          :isExpired="false" />
      </div>
    </div>
  </div>
</template>
