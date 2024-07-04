<script setup lang="ts">
  import {
    ref,
    useNuxtApp,
    watch,
    useRoute,
    navigateTo,
    useRuntimeConfig
  } from '#imports';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
  import { useHead } from 'unhead';

  useHead({
    title: 'Org Settings - Invites'
  });

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg
  const orgShortCode = (useRoute().params.orgShortCode ?? '') as string;

  const { $trpc } = useNuxtApp();
  const { data: isAdmin } =
    await $trpc.org.users.members.isOrgMemberAdmin.useQuery({ orgShortCode });

  if (!isAdmin.value) {
    await navigateTo(`/${orgShortCode}/settings`);
  }

  const {
    data: orgInviteQuery,
    pending,
    refresh
  } = await $trpc.org.users.invites.viewInvites.useLazyQuery(
    { orgShortCode },
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
      key: 'link',
      label: 'Invite link'
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
          link: `${useRuntimeConfig().public.siteUrl}/join/invite/${invite.inviteToken}`,
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
          createdByOrgMemberProfilePublicId: invite.invitedByOrgMember.profile
            ? invite.invitedByOrgMember.profile.publicId
            : '',
          createdByAvatarTimestamp: invite.invitedByOrgMember.profile
            ? invite.invitedByOrgMember.profile.avatarTimestamp
            : '',
          created: invite.invitedAt,
          orgMemberProfilePublicId: invite.orgMember?.profile
            ? invite.orgMember?.profile.publicId
            : '',
          orgMemberAvatarTimestamp: invite.orgMember?.profile
            ? invite.orgMember?.profile.avatarTimestamp
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
        <UnUiButton
          v-if="isMobile"
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="navigateTo(`/${orgShortCode}/settings`)" />

        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Invites</span>
          <span class="text-sm">Manage your org invitations</span>
        </div>
      </div>
      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          label="Add new"
          icon="i-ph-plus"
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
                :public-id="row.orgMemberProfilePublicId"
                :avatar-timestamp="row.orgMemberAvatarTimestamp"
                :type="'orgMember'"
                :alt="row.usedBy ? row.usedBy : ''"
                size="xs" />
              <span class="">{{ row.usedBy }}</span>
            </div>
          </template>
          <template #code-data="{ row }">
            <div
              class="flex w-full flex-row items-center justify-between gap-2">
              <UnUiCopy
                v-if="row.code"
                :text="row.code" />
            </div>
          </template>
          <template #link-data="{ row }">
            <div
              class="flex w-full flex-row items-center justify-between gap-2">
              <UnUiCopy
                v-if="row.link"
                :text="row.link" />
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
                :public-id="row.createdByOrgMemberProfilePublicId"
                :avatar-timestamp="row.createdByAvatarTimestamp"
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
