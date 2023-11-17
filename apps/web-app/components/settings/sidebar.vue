<script setup lang="ts">
  import type { VerticalNavigationLink } from '@nuxt/ui/dist/runtime/types/vertical-navigation';

  const { $trpc } = useNuxtApp();

  const navStore = useNavStore();
  const { settingsSelectedOrg, userHasAdminOrgs } = storeToRefs(navStore);
  const route = useRoute();
  const router = useRouter();

  watch(settingsSelectedOrg, (newVal) => {
    const currentOrgRoute = route.params.orgId as string;
    if (currentOrgRoute) {
      const newPath = route.path.replace(currentOrgRoute, newVal);
      router.push(newPath);
    }
  });

  const {
    data: userOrgs,
    pending,
    error,
    refresh
  } = await $trpc.org.crud.getUserOrgs.useLazyQuery(
    {
      onlyAdmin: true
    },
    { server: false, queryKey: 'getUserOrgsSidebar' }
  );
  const userOrgsButtons = ref<VerticalNavigationLink[]>([]);
  watch(userOrgs, (newVal) => {
    if (newVal && newVal.userOrgs.length > 0) {
      if (!userHasAdminOrgs.value) userHasAdminOrgs.value = true;
      if (!settingsSelectedOrg.value) {
        settingsSelectedOrg.value = newVal.userOrgs[0].org.publicId;
      }
      userOrgsButtons.value = [];
      for (const org of newVal.userOrgs) {
        userOrgsButtons.value.push({
          label: org.org.name,
          avatar: {
            //@ts-ignore
            avatarId: org.org.avatarId,
            alt: org.org.name
          },
          // active: settingsSelectedOrg.value === org.org.publicId,
          to: `/settings/org/${org.org.publicId}`,
          custom: true
        });
      }
      userOrgsButtons.value.push({
        label: 'Create New Org',
        to: '/settings/org/new',
        icon: 'i-ph-plus'
      });
    }
  });

  // TODO: fix scroll bar positioning, move to right, approx 20 px (may need to move to a parent div)
  const eeBilling = useEE().config.modules.billing;

  // Settings Links

  const personalLinks = [
    {
      label: 'Profile',
      to: '/settings/user/profiles',
      icon: 'i-ph-user-circle-gear'
    },
    {
      label: 'Personal Addresses',
      to: '/settings/user/addresses',
      icon: 'i-ph-envelope-open'
    }
  ];
  const orgSetupLinks = computed(() => [
    {
      label: 'Org Profile',
      to: `/settings/org/${settingsSelectedOrg.value}`,
      icon: 'i-ph-buildings'
    },
    {
      label: 'Billing',
      to: `/settings/org/${settingsSelectedOrg.value}/setup/billing`,
      icon: 'i-ph-credit-card'
    }
  ]);
  const orgUsersLinks = computed(() => [
    {
      label: 'Members',
      to: `/settings/org/${settingsSelectedOrg.value}/users/members`,
      icon: 'i-ph-users'
    },
    {
      label: 'Invites',
      to: `/settings/org/${settingsSelectedOrg.value}/users/invites`,
      icon: 'i-ph-user-plus'
    },
    {
      label: 'Groups',
      to: `/settings/org/${settingsSelectedOrg.value}/users/groups`,
      icon: 'i-ph-users-three'
    }
  ]);
  const orgMailLinks = computed(() => [
    {
      label: 'Domains',
      to: `/settings/org/${settingsSelectedOrg.value}/mail/domains`,
      icon: 'i-ph-globe'
    },
    {
      label: 'Email Addresses',
      to: `/settings/org/${settingsSelectedOrg.value}/mail/addresses`,
      icon: 'i-ph-at'
    }
  ]);
</script>
<template>
  <div
    class="h-full max-h-full flex flex-col gap-2 overflow-y-scroll border-r-1 border-base-6 pr-4">
    <div
      class="h-full max-h-full flex grow flex-col gap-4 overflow-hidden overflow-y-scroll">
      <div class="w-full flex flex-col gap-2 border-b-1 border-base-6">
        <div>
          <span class="font-display">Personal</span>
        </div>
        <UnUiVerticalNavigation :links="personalLinks" />
      </div>
      <div class="mb-[48px] flex flex-col gap-4">
        <div>
          <span class="font-display">Org</span>
        </div>
        <div
          v-if="pending"
          class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
          <UnUiIcon
            name="svg-spinners:3-dots-fade"
            size="24" />
          <span>Loading organizations</span>
        </div>
        <div
          v-if="!userHasAdminOrgs && !pending"
          class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
          <UnUiIcon
            name="ph-identification-badge"
            size="24" />
          <span>You are not an admin in any organizations</span>
        </div>

        <UnUiVerticalNavigation
          v-if="!pending"
          :links="userOrgsButtons" />

        <div
          v-if="userHasAdminOrgs && !pending"
          class="flex flex-col gap-2">
          <div class="flex flex-col gap-2 pb-2 pl-2">
            <span
              class="border-b-1 border-base-3 pb-1 text-xs font-semibold uppercase text-base-11">
              Setup
            </span>
            <UnUiVerticalNavigation :links="orgSetupLinks" />
          </div>
          <div class="flex flex-col gap-2 pb-2 pl-2">
            <span
              class="border-b-1 border-base-3 pb-1 text-xs font-semibold uppercase text-base-11">
              Users
            </span>
            <UnUiVerticalNavigation :links="orgUsersLinks" />
          </div>
          <div class="flex flex-col gap-2 pb-2 pl-2">
            <span
              class="border-b-1 border-base-3 pb-1 text-xs font-semibold uppercase text-base-11">
              Mail
            </span>
            <UnUiVerticalNavigation :links="orgMailLinks" />
          </div>
        </div>
      </div>

      <div class="mt-[-48px] h-[48px] from-base-1 bg-gradient-to-t" />
    </div>
  </div>
</template>
