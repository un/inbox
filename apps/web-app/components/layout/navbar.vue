<script setup lang="ts">
  import {
    computed,
    navigateTo,
    ref,
    useNuxtApp,
    useRuntimeConfig,
    useColorMode,
    useToast,
    useRouter,
    watch,
    useRoute,
    useState
  } from '#imports';
  const colorMode = useColorMode();
  const toggleColorMode = () => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
  };

  const colorModeLabel = computed(() =>
    colorMode.value === 'dark' ? 'Light Mode' : 'Dark Mode'
  );
  const colorModeIcon = computed(() =>
    colorMode.value === 'dark' ? 'i-ph-sun' : 'i-ph-moon-stars'
  );

  const currentPath = ref(useRouter().currentRoute.value.path as string);
  const orgSlug = useRoute().params.orgSlug as string;
  const router = useRouter();
  router.beforeEach((to) => {
    currentPath.value = to.path;
  });

  const navLinks = [
    {
      label: 'Conversations',
      to: `/${orgSlug}/convo`,
      icon: 'i-ph-chat-circle'
    },
    {
      label: 'Contacts',
      // to: `/${orgSlug}/screener`,
      icon: 'i-ph-address-book',
      tooltip: 'Manage your contacts',
      disabled: true,
      badge: 'Soon'
    },
    {
      label: 'Group Convos',
      // to: `/${orgSlug}/convo`,
      tooltip: 'Separate your group and personal conversations',
      icon: 'i-ph-chats-circle',

      disabled: true,
      badge: 'Soon'
    },
    {
      label: 'Screener',
      // to: `/${orgSlug}/screener`,
      tooltip: 'Set who can or cant email you',
      icon: 'i-ph-hand',
      disabled: true,
      badge: 'Soon'
    },
    {
      label: 'Feed',
      // to: `/${orgSlug}/feed`,
      tooltip:
        'All your newsletters, marketing messages, and product updates in one place',
      icon: 'i-ph-newspaper',
      disabled: true,
      badge: 'Soon'
    },
    {
      label: 'Codes',
      // to: `/${orgSlug}/codes`,
      tooltip: 'Easily copy your login or verification codes',
      icon: 'i-ph-password',
      disabled: true,
      badge: 'Soon'
    }
  ];

  const { $trpc } = useNuxtApp();

  const { data: orgMemberProfile } =
    $trpc.account.profile.getOrgMemberProfile.useLazyQuery(
      { orgSlug: orgSlug },
      { server: false, queryKey: 'getOrgMemberSingleProfileNav' }
    );

  const { data: accountOrgs } =
    await $trpc.org.crud.getAccountOrgs.useLazyQuery(
      {},
      { server: false, queryKey: 'getUserOrgsNav' }
    );

  const isAccountAdminOfActiveOrg = ref(false);
  watch(accountOrgs, (newUserOrgs) => {
    const userOrgSlugs = newUserOrgs?.userOrgs.map(
      (userOrg) => userOrg.org.slug
    );
    if (newUserOrgs?.adminOrgSlugs?.includes(orgSlug)) {
      isAccountAdminOfActiveOrg.value = true;
    } else {
      isAccountAdminOfActiveOrg.value = false;
    }

    if (!userOrgSlugs?.includes(orgSlug)) {
      navigateTo(`/redirect`);
    }
  });

  const currentOrgProfile = computed(() => {
    if (accountOrgs.value && accountOrgs.value.userOrgs.length > 0) {
      return accountOrgs.value.userOrgs.find((org) => org.org.slug === orgSlug)
        ?.org;
    }
    return null;
  });

  interface OrgButtons {
    slot: 'org';
    label: string;
    publicId: string;
    avatarId: string | null;
    slug: string;
    click: () => void;
  }
  const userOrgsButtons = ref<OrgButtons[]>([]);

  watch(accountOrgs, (newVal) => {
    if (newVal && newVal.userOrgs.length > 0) {
      userOrgsButtons.value = [];
      for (const org of newVal.userOrgs) {
        userOrgsButtons.value.push({
          slot: 'org',
          label: org.org.name,
          publicId: org.org.publicId,
          avatarId: org.org.avatarId,
          slug: org.org.slug,
          click: () => {
            navigateTo(`/${org.org.slug}`);
          }
        });
      }
    }
  });

  const userMenuItems = computed(() => [
    [
      {
        publicId: orgMemberProfile.value?.profile?.publicId || '',
        label:
          orgMemberProfile.value?.profile?.firstName +
          ' ' +
          orgMemberProfile.value?.profile?.lastName,
        slot: 'account'
      }
    ],
    userOrgsButtons.value,
    [
      {
        label: 'Account Settings',
        icon: 'i-ph-user',
        click: () => {
          navigateTo(`/${orgSlug}/settings`);
        }
      },
      ...(isAccountAdminOfActiveOrg.value
        ? [
            {
              label: 'Organization Settings',
              icon: 'i-ph-gear',
              click: () => {
                navigateTo(`/${orgSlug}/settings`);
              }
            }
          ]
        : []),
      {
        label: colorModeLabel.value,
        icon: colorModeIcon.value,
        slot: 'darkmode',
        click: () => {
          toggleColorMode();
        }
      },
      {
        label: 'Help',
        icon: 'i-ph-question',
        slot: 'helpmenu'
      }
    ],
    [
      {
        label: 'Sign out',
        icon: 'i-ph-sign-out',
        click: () => {
          showLogoutModal.value = true;
        }
      }
    ]
  ]);
  const helpMenuItems = [
    [
      {
        label: 'Documentation',
        icon: 'i-ph-book',
        disabled: false
      },
      {
        label: 'Support',
        icon: 'i-ph-question',
        disabled: false
      },
      {
        label: 'Roadmap',
        icon: 'i-ph-map-trifold',
        disabled: false
      },
      {
        label: 'Changelog',
        icon: 'i-ph-megaphone',
        disabled: false
      },
      {
        label: 'Status',
        icon: 'i-ph-activity',
        disabled: false
      }
    ]
  ];

  const showLogoutModal = ref(false);
  const closeModal = () => {
    showLogoutModal.value = false;
  };

  async function useLogout() {
    const toast = useToast();
    if (process.server) {
      return null;
    }
    await fetch(`${useRuntimeConfig().public.platformUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    useState('auth').value = 'unauthenticated';
    navigateTo(`/`);
    toast.add({
      title: 'Logged out',
      description: 'You have been logged out',
      color: 'green',
      timeout: 5000
    });
  }
</script>
<template>
  <div
    class="bg-base-2 border-base-7 flex h-full max-h-full flex-col justify-between rounded-r-xl border-r-2 p-8 shadow-xl transition-all duration-300">
    <UnUiModal v-model="showLogoutModal">
      <template #header>
        <span class="">Logout</span>
      </template>
      <div class="flex w-full flex-col gap-8">
        <p>Are you sure you want to logout?</p>
        <div class="flex w-full flex-row justify-end gap-4">
          <UnUiButton
            label="Cancel"
            size="xl"
            @click="closeModal" />
          <UnUiButton
            label="Logout"
            size="xl"
            color="red"
            @click="useLogout()" />
        </div>
      </div>
    </UnUiModal>
    <UnUiVerticalNavigation :links="navLinks">
      <template #default="{ link }">
        <UnUiTooltip
          v-if="link.tooltip"
          :text="link.tooltip"
          :popper="{ placement: 'right-start' }">
          <span class="text-base-12 truncate">{{ link.label }}</span>
        </UnUiTooltip>
      </template>
      <template #badge="{ link }">
        <div class="relative ml-4 flex flex-1 items-end justify-end truncate">
          <UnUiBadge
            v-if="link.badge"
            size="xs"
            variant="soft"
            :label="link.badge" />
        </div>
      </template>
    </UnUiVerticalNavigation>

    <NuxtUiDropdown
      :items="userMenuItems"
      :ui="{
        // width: 'w-52',
        item: {
          disabled: 'cursor-text select-text',
          base: 'group w-full flex items-center gap-4'
        }
      }"
      :popper="{ placement: 'top-start' }">
      <div
        class="flex w-full max-w-[240px] flex-row items-center justify-between gap-2 p-2">
        <div class="flex w-full flex-row items-center gap-2 overflow-hidden">
          <UnUiAvatar
            :public-id="currentOrgProfile?.publicId || ''"
            :avatar-id="currentOrgProfile?.avatarId || ''"
            :type="'org'"
            :alt="currentOrgProfile?.name"
            size="xs" />
          <span class="truncate text-sm">{{ currentOrgProfile?.name }}</span>
        </div>
        <UnUiIcon name="i-ph-caret-up" />
      </div>
      <template #account>
        <div class="flex flex-col gap-2 text-left">
          <p>Signed in as</p>
          <div class="flex w-full flex-row items-center gap-2 overflow-hidden">
            <UnUiAvatar
              :public-id="orgMemberProfile?.profile?.publicId || ''"
              :avatar-id="orgMemberProfile?.profile?.avatarId || ''"
              :type="'orgMember'"
              :alt="
                orgMemberProfile?.profile?.firstName +
                ' ' +
                orgMemberProfile?.profile?.lastName
              " />
            <span class="truncate text-sm">{{
              orgMemberProfile?.profile?.firstName +
              ' ' +
              orgMemberProfile?.profile?.lastName
            }}</span>
          </div>
        </div>
      </template>
      <template #org="{ item }">
        <div class="flex max-w-full flex-row items-center gap-2">
          <UnUiAvatar
            :public-id="item.publicId"
            :avatar-id="item.avatarId"
            :type="'org'"
            :alt="item.label"
            size="sm" />
          <div class="text-left">
            <p class="truncate font-medium">
              {{ item.label }}
            </p>
          </div>
        </div>
        <UnUiIcon
          v-if="item.slug === orgSlug"
          name="i-ph-check"
          class="ms-auto h-4 w-4 flex-shrink-0" />
      </template>
      <template #darkmode>
        <span class="truncate">{{ colorModeLabel }}</span>
        <UnUiIcon
          :name="colorModeIcon"
          class="ms-auto h-4 w-4 flex-shrink-0" />
      </template>
      <template #helpmenu="{ item }">
        <NuxtUiDropdown
          :items="helpMenuItems"
          mode="hover"
          :ui="{ item: { disabled: 'cursor-text select-text' } }"
          :popper="{ offsetDistance: -5, placement: 'right-start' }"
          class="w-full">
          <div class="flex w-full flex-row items-center justify-between">
            <span class="truncate">{{ item.label }}</span>
            <UnUiIcon
              :name="item.icon"
              class="ms-auto h-4 w-4 flex-shrink-0" />
          </div>
          <!-- eslint-disable vue/no-template-shadow -->
          <template #item="{ item }">
            <!-- eslint-enable -->
            <span class="truncate">{{ item.label }}</span>
            <UnUiIcon
              :name="item.icon"
              class="ms-auto h-4 w-4 flex-shrink-0" />
          </template>
        </NuxtUiDropdown>
      </template>
      <template #item="{ item }">
        <span class="truncate">{{ item.label }}</span>
        <UnUiIcon
          :name="item.icon"
          class="ms-auto h-4 w-4 flex-shrink-0" />
      </template>
    </NuxtUiDropdown>
  </div>
</template>
