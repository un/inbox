<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
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

  const {
    data: orgInviteQuery,
    pending,
    error,
    refresh
  } = await $trpc.org.users.invites.viewInvites.useLazyQuery(
    {},
    { server: false }
  );

  const tableColumns = [
    {
      key: 'status',
      label: 'Status',
      sortable: true
    },
    {
      key: 'code',
      label: 'Invite Code',
      sortable: true
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true
    },
    // {
    //   key: 'role',
    //   label: 'Role',
    //   sortable: true
    // },

    {
      key: 'usedBy',
      label: 'Used By',
      sortable: true
    },
    {
      key: 'createdBy',
      label: 'Admin',
      sortable: true
    },
    // {
    //   key: 'created',
    //   label: 'Created On',
    //   sortable: true
    // },
    {
      key: 'expiry',
      label: 'Expiry',
      sortable: true
    }
  ];

  const tableRows = ref<{}[]>([]);
  watch(
    orgInviteQuery,
    (newResults) => {
      if (newResults) {
        const newTableRows: {}[] = [];
        for (const invite of newResults.invites) {
          const dateNow = new Date();
          const truncateEmail = (email: string) => {
            const [localPart, domain] = email.split('@');
            const truncatedLocalPart =
              localPart.length > 4
                ? `${localPart.substring(0, 4)}...`
                : localPart;
            const [domainName, tld] = domain.split('.');
            const truncatedDomainName =
              domainName.length > 6
                ? `${domainName.substring(0, 4)}..`
                : domainName;
            return `${truncatedLocalPart}@${truncatedDomainName}.${tld}`;
          };
          newTableRows.push({
            code: invite.inviteToken,
            truncatedCode: invite.inviteToken
              ? invite.inviteToken.substring(0, 8) + '...'
              : '',
            email: invite.email,
            truncatedEmail: truncateEmail(invite.email ? invite.email : ''),
            role: invite.role,
            status: invite.expiresAt
              ? invite.acceptedAt
                ? 'used'
                : invite.expiresAt < dateNow
                  ? 'expired'
                  : 'active'
              : 'active',
            creatorAvatar:
              invite.invitedByUser.orgMemberships[0].profile.avatarId,
            createdBy:
              invite.invitedByUser.orgMemberships[0].profile.firstName +
              ' ' +
              invite.invitedByUser.orgMemberships[0].profile.lastName,
            created: invite.invitedAt,
            userAvatar: invite.invitedUser?.orgMemberships[0].profile
              ? invite.invitedUser?.orgMemberships[0].profile.avatarId
              : null,
            usedBy: invite.invitedUser?.orgMemberships[0].profile
              ? invite.invitedUser?.orgMemberships[0].profile.firstName +
                ' ' +
                invite.invitedUser?.orgMemberships[0].profile.lastName
              : null,
            expiry: invite.expiresAt
          });
        }
        tableRows.value = newTableRows;
      }
    }
    // ,
    // { immediate: true }
  );

  async function createInvite() {
    if (inviteEmailValid.value === false) return;
    buttonLoading.value = true;
    buttonLabel.value = 'Creating invite...';
    const newInviteResponse =
      await $trpc.org.users.invites.createNewInvite.mutate({
        inviteeEmail: inviteEmailValue.value,
        role: 'member'
      });
    buttonLoading.value = false;
    buttonLabel.value = 'All done';
    inviteEmailValue.value = '';
    newInviteCode.value = newInviteResponse.inviteToken;
    refresh();

    const toast = useToast();
    toast.add({
      id: 'invite_created',
      title: 'Invite Created',
      description: `New Invite has been created successfully.`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-display">Invites</span>
          <span class="text-sm">Manage your org invitations</span>
        </div>
      </div>
      <div class="flex flex-row items-center gap-4">
        <button
          class="max-w-80 flex flex-row items-center justify-center gap-2 border-1 border-base-7 rounded bg-base-3 p-2"
          @click="showInviteModal = !showInviteModal">
          <UnUiIcon
            name="i-ph-plus"
            size="20" />
          <p class="text-sm">Invite</p>
        </button>
      </div>
    </div>
    <div
      v-if="showInviteModal"
      class="w-full flex flex-col justify-start gap-4">
      <span class="text-md font-semibold">Create a new invite</span>
      <div class="flex flex-row gap-8">
        <div class="flex flex-col gap-4">
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
            @click="createInvite()" />
        </div>
        <div
          v-if="newInviteCode"
          class="w-full flex flex-col gap-0">
          <span class="text-sm font-semibold uppercase text-base-11"
            >Invite Code</span
          >
          <div class="flex flex-row gap-4">
            <span class="font-mono">{{ newInviteCode }}</span>
            <button
              v-if="newInviteCode"
              class="flex flex-row items-center justify-center gap-1 rounded bg-base-3 p-1 text-xs hover:bg-base-4"
              @click="copy(newInviteCode)">
              <!-- by default, `copied` will be reset in 1.5s -->
              <UnUiIcon
                name="i-ph-clipboard"
                size="16"
                :class="copied ? 'text-green-500' : 'text-base-11'" />
              <span v-if="!copied">Copy</span>
              <span v-else>Copied!</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="w-full flex flex-col gap-8 overflow-y-scroll">
      <div class="w-full flex flex-col gap-8">
        <NuxtUiTable
          :columns="tableColumns"
          :rows="tableRows"
          class=""
          :loading="pending">
          <template #status-data="{ row }">
            <UnUiBadge :color="row.status === 'active' ? 'green' : 'red'">
              <span class="uppercase">{{ row.status }}</span>
            </UnUiBadge>
          </template>
          <template #code-data="{ row }">
            <div
              class="w-full flex flex-row items-center justify-between gap-2">
              <UnUiTooltip :text="row.code">
                <span class="">{{ row.truncatedCode }}</span>
              </UnUiTooltip>
              <button
                v-if="row.code"
                class="flex flex-row items-center justify-center gap-1 rounded bg-base-3 p-1 text-xs hover:bg-base-4"
                @click="copy(row.code)">
                <!-- by default, `copied` will be reset in 1.5s -->
                <UnUiIcon
                  name="i-ph-clipboard"
                  size="16"
                  :class="copied ? 'text-green-500' : 'text-base-11'" />
                <span v-if="text !== row.code">Copy</span>
                <span v-else>Copied!</span>
              </button>
            </div>
          </template>
          <template #email-data="{ row }">
            <UnUiTooltip :text="row.email">
              <span class="">{{ row.truncatedEmail }}</span>
            </UnUiTooltip>
          </template>
          <!-- <template #role-data="{ row }">
            <UnUiBadge :color="row.role === 'admin' ? 'amber' : 'blue'">
              <span class="uppercase">{{ row.role }}</span>
            </UnUiBadge>
          </template> -->
          <template #usedBy-data="{ row }">
            <div class="flex flex-row items-center gap-2">
              <UnUiAvatar
                v-if="row.userAvatar || row.usedBy"
                :avatar-id="row.userAvatar ? row.userAvatar : ''"
                :name="row.usedBy ? row.usedBy : ''"
                size="xs" />
              <span class="">{{ row.usedBy }}</span>
            </div>
          </template>
          <template #createdBy-data="{ row }">
            <div class="flex flex-row items-center gap-2">
              <UnUiAvatar
                :avatar-id="row.creatorAvatar ? row.creatorAvatar : ''"
                :name="row.createdBy ? row.createdBy : ''"
                size="xs" />
              <span class="">{{ row.createdBy }}</span>
            </div>
          </template>
          <template #created-data="{ row }">
            <span class="text-xs">{{ row.created.toDateString() }}</span>
          </template>
          <template #expiry-data="{ row }">
            <span class="text-xs">{{ row.expiry.toDateString() }}</span>
          </template>
        </NuxtUiTable>
      </div>
    </div>
  </div>
</template>
