<script setup lang="ts">
  import { computed, useRoute, navigateTo, useNuxtApp } from '#imports';
  import { useEE } from '~/composables/EE';

  const { $trpc } = useNuxtApp();
  const orgShortcode = useRoute().params.orgShortcode as string;

  const eeBilling = useEE().config.modules.billing;

  const { data: currentIds } = $trpc.account.defaults.getIds.useQuery({});

  // Settings Links

  const personalLinks = [
    {
      label: 'Profile',
      to: `/${orgShortcode}/settings/user/profiles`,
      icon: 'i-ph-user-circle-gear'
    },
    {
      label: 'Personal Addresses',
      to: `/${orgShortcode}/settings/user/addresses`,
      icon: 'i-ph-envelope-open'
    },
    {
      label: 'Security',
      to: `/${orgShortcode}/settings/user/security`,
      icon: 'i-ph-lock'
    }
  ];
  const orgSetupLinks = computed(() => [
    {
      label: 'Org Profile',
      to: `/${orgShortcode}/settings/org`,
      icon: 'i-ph-buildings'
    },
    ...(eeBilling
      ? [
          {
            label: 'Billing',
            to: `/${orgShortcode}/settings/org/setup/billing`,
            icon: 'i-ph-credit-card'
          }
        ]
      : [])
  ]);
  const orgUsersLinks = computed(() => [
    {
      label: 'Members',
      to: `/${orgShortcode}/settings/org/users/members`,
      icon: 'i-ph-users'
    },
    {
      label: 'Invites',
      to: `/${orgShortcode}/settings/org/users/invites`,
      icon: 'i-ph-user-plus'
    },
    {
      label: 'Groups',
      to: `/${orgShortcode}/settings/org/users/groups`,
      icon: 'i-ph-users-three'
    }
  ]);
  const orgMailLinks = computed(() => [
    {
      label: 'Domains',
      to: `/${orgShortcode}/settings/org/mail/domains`,
      icon: 'i-ph-globe'
    },
    {
      label: 'Email Addresses',
      to: `/${orgShortcode}/settings/org/mail/addresses`,
      icon: 'i-ph-at'
    }
  ]);
</script>
<template>
  <div
    class="bg-base-1 border-base-6 z-[30] flex h-full max-h-full w-full flex-col gap-2 overflow-y-auto border-r px-4 py-2 pb-12">
    <div
      class="flex h-full max-h-full grow flex-col gap-8 overflow-hidden overflow-y-auto">
      <div class="flex w-full flex-col gap-2">
        <div class="flex flex-row items-center justify-between">
          <span class="font-display text-base-11">Personal</span>
          <UnUiCopy
            v-if="currentIds?.orgMemberPublicId"
            :text="currentIds?.orgMemberPublicId"
            variant="ghost"
            size="xs"
            icon="i-ph-hash"
            helper="Copy User ID" />
        </div>
        <UnUiVerticalNavigation :links="personalLinks" />
      </div>
      <div class="border-base-7 w-full border-[1px]" />
      <div class="flex flex-col gap-4">
        <div class="flex flex-row items-center justify-between">
          <span class="font-display text-base-11">Organization</span>
          <UnUiCopy
            v-if="currentIds?.orgPublicId"
            :text="currentIds?.orgPublicId"
            variant="ghost"
            size="xs"
            icon="i-ph-hash"
            helper="Copy Organization ID" />
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-2 pb-2 pl-2">
            <span
              class="border-b-1 border-base-3 text-base-12 pb-1 text-xs font-semibold uppercase">
              Setup
            </span>
            <UnUiVerticalNavigation :links="orgSetupLinks" />
          </div>
          <div class="flex flex-col gap-2 pb-2 pl-2">
            <span
              class="border-b-1 border-base-3 text-base-12 pb-1 text-xs font-semibold uppercase">
              Users
            </span>
            <UnUiVerticalNavigation :links="orgUsersLinks" />
          </div>
          <div class="flex flex-col gap-2 pb-2 pl-2">
            <span
              class="border-b-1 border-base-3 text-base-12 pb-1 text-xs font-semibold uppercase">
              Mail
            </span>
            <UnUiVerticalNavigation :links="orgMailLinks" />
          </div>
        </div>
      </div>
      <div class="mb-9 px-2">
        <UnUiButton
          label="Add new organization"
          icon="i-ph-plus"
          variant="ghost"
          @click="navigateTo('/join/org')" />
      </div>
    </div>
  </div>
</template>
