<script setup lang="ts">
  import { computed, useRoute } from '#imports';
  import { useEE } from '~/composables/EE';

  const orgSlug = useRoute().params.orgSlug as string;

  const eeBilling = useEE().config.modules.billing;

  // Settings Links

  const personalLinks = [
    {
      label: 'Profile',
      to: `/${orgSlug}/settings/user/profiles`,
      icon: 'i-ph-user-circle-gear'
    },
    {
      label: 'Personal Addresses',
      to: `/${orgSlug}/settings/user/addresses`,
      icon: 'i-ph-envelope-open'
    }
  ];
  const orgSetupLinks = computed(() => [
    {
      label: 'Org Profile',
      to: `/${orgSlug}/settings/org`,
      icon: 'i-ph-buildings'
    },
    ...(eeBilling
      ? [
          {
            label: 'Billing',
            to: `/${orgSlug}/settings/org/setup/billing`,
            icon: 'i-ph-credit-card'
          }
        ]
      : [])
  ]);
  const orgUsersLinks = computed(() => [
    {
      label: 'Members',
      to: `/${orgSlug}/settings/org/users/members`,
      icon: 'i-ph-users'
    },
    {
      label: 'Invites',
      to: `/${orgSlug}/settings/org/users/invites`,
      icon: 'i-ph-user-plus'
    },
    {
      label: 'Groups',
      to: `/${orgSlug}/settings/org/users/groups`,
      icon: 'i-ph-users-three'
    }
  ]);
  const orgMailLinks = computed(() => [
    {
      label: 'Domains',
      to: `/${orgSlug}/settings/org/mail/domains`,
      icon: 'i-ph-globe'
    },
    {
      label: 'Email Addresses',
      to: `/${orgSlug}/settings/org/mail/addresses`,
      icon: 'i-ph-at'
    }
  ]);
</script>
<template>
  <div
    class="bg-base-2 border-base-6 flex h-full max-h-full flex-col gap-2 overflow-y-auto rounded-r-xl border-r-2 p-8 pl-12 shadow-md">
    <div
      class="flex h-full max-h-full grow flex-col gap-4 overflow-hidden overflow-y-auto">
      <div class="flex w-full flex-col gap-2">
        <div>
          <span class="font-display text-base-11">Personal</span>
        </div>
        <UnUiVerticalNavigation :links="personalLinks" />
      </div>
      <div class="mb-[48px] flex flex-col gap-4">
        <div>
          <span class="font-display text-base-11">Org</span>
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
    </div>
  </div>
</template>
