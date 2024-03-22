<script setup lang="ts">
  import { ref, useNuxtApp, watch } from '#imports';

  const { $trpc } = useNuxtApp();

  const {
    data: orgInviteQuery,
    pending,
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
      key: 'usedBy',
      label: 'User',
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
    {
      key: 'role',
      label: 'Role',
      sortable: true
    },
    {
      key: 'createdBy',
      label: 'Admin',
      sortable: true
    },
    {
      key: 'expiry',
      label: 'Expiry',
      sortable: true
    }
  ];

  const tableRows = ref<{}[]>([]);
  watch(orgInviteQuery, (newResults) => {
    if (newResults) {
      const newTableRows: {}[] = [];
      for (const invite of newResults.invites) {
        const dateNow = new Date();
        const truncateEmail = (email: string) => {
          const [localPart, domain] = email.split('@');
          const truncatedLocalPart =
            localPart?.length ?? 0 > 4
              ? `${localPart?.substring(0, 4) ?? ''}...`
              : localPart;
          const [domainName, tld] = (domain ?? '').split('.');
          const truncatedDomainName =
            (domainName ?? '').length > 6
              ? `${domainName?.substring(0, 4)}..`
              : domainName;
          return `${truncatedLocalPart}@${truncatedDomainName}.${tld}`;
        };
        newTableRows.push({
          code: invite.inviteToken,
          truncatedCode: invite.inviteToken
            ? invite.inviteToken.substring(0, 8) + '...'
            : '',
          email: invite.email,
          truncatedEmail: invite.email ? truncateEmail(invite.email) : '',
          role: invite.role,
          status: invite.expiresAt
            ? invite.acceptedAt
              ? 'used'
              : invite.expiresAt < dateNow
                ? 'expired'
                : 'active'
            : 'active',
          createdBy:
            invite.invitedByOrgMember.profile.firstName +
            ' ' +
            invite.invitedByOrgMember.profile.lastName,
          createdByAvatarId: invite.invitedByOrgMember.profile
            ? invite.invitedByOrgMember.profile.avatarId
            : '',
          created: invite.invitedAt,
          orgMemberAvatarId: invite.orgMember?.profile
            ? invite.orgMember?.profile.avatarId
            : '',
          usedBy: invite.orgMember?.profile
            ? invite.orgMember?.profile.firstName +
              ' ' +
              invite.orgMember?.profile.lastName
            : null,
          expiry: invite.expiresAt
        });
      }
      tableRows.value = newTableRows;
    }
  });

  const addNewModalOpen = ref(false);
  const closeModal = () => {
    addNewModalOpen.value = false;
    refresh();
  };
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Invites</span>
          <span class="text-sm">Manage your org invitations</span>
        </div>
      </div>
      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          label="Add new"
          @click="addNewModalOpen = true" />
        <UnUiModal v-model="addNewModalOpen">
          <template #header>
            <span class="">Invite a new user</span>
          </template>
          <SettingsAddNewInvite
            lazy
            @close="closeModal()" />
        </UnUiModal>
      </div>
    </div>
    <div class="flex w-full flex-col gap-8 overflow-y-auto">
      <div class="flex w-full flex-col gap-8">
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
          <template #usedBy-data="{ row }">
            <div class="flex flex-row items-center gap-2">
              <UnUiAvatar
                v-if="row.userAvatar || row.usedBy"
                :public-id="''"
                :avatar-id="row.orgMemberAvatarId"
                :type="'orgMember'"
                :alt="row.usedBy ? row.usedBy : ''"
                size="xs" />
              <span class="">{{ row.usedBy }}</span>
            </div>
          </template>
          <template #code-data="{ row }">
            <div
              class="flex w-full flex-row items-center justify-between gap-2">
              <UnUiTooltip :text="row.code">
                <span class="">{{ row.truncatedCode }}</span>
              </UnUiTooltip>
              <UnUiCopy
                v-if="row.code"
                :text="row.code" />
            </div>
          </template>
          <template #email-data="{ row }">
            <UnUiTooltip :text="row.email">
              <span class="">{{ row.truncatedEmail }}</span>
            </UnUiTooltip>
          </template>
          <template #role-data="{ row }">
            <UnUiBadge :color="row.role === 'admin' ? 'amber' : 'bronze'">
              <span class="uppercase">{{ row.role }}</span>
            </UnUiBadge>
          </template>
          <template #createdBy-data="{ row }">
            <div class="flex flex-row items-center gap-2">
              <UnUiAvatar
                :public-id="row.createdByAvatarId"
                :avatar-id="row.creatorAvatarId"
                :type="'orgMember'"
                :alt="row.createdBy ? row.createdBy : ''"
                size="xs" />
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
