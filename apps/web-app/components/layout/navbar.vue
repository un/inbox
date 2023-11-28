<script setup lang="ts">
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
  router.beforeEach((to, from) => {
    currentPath.value = to.path;
  });

  const navLinks = [
    {
      label: 'Conversations',
      to: `/${orgSlug}/convo`,
      icon: 'i-ph-chat-circle'
    },
    {
      label: 'Screener',
      to: `/${orgSlug}/screener`,
      icon: 'i-ph-hand'
    },
    {
      label: 'Feed',
      to: `/${orgSlug}/feed`,
      icon: 'i-ph-newspaper'
    },
    {
      label: 'Codes',
      to: `/${orgSlug}/codes`,
      icon: 'i-ph-password'
    }
  ];

  const { $trpc } = useNuxtApp();

  const { data: userProfile } =
    await $trpc.user.profile.getUserOrgProfile.useQuery(
      { orgSlug: orgSlug },
      { server: false, queryKey: 'getUserSingleProfileNav' }
    );

  const {
    data: userOrgs,
    pending,
    error,
    refresh
  } = await $trpc.org.crud.getUserOrgs.useLazyQuery(
    {},
    { server: false, queryKey: 'getUserOrgsNav' }
  );

  const isUserAdminOfActiveOrg = ref(false);
  watch(userOrgs, (newUserOrgs) => {
    const userOrgSlugs = newUserOrgs?.userOrgs.map(
      (userOrg) => userOrg.org.slug
    );
    const userPersonalOrgSlug = newUserOrgs?.personalOrgs?.map(
      (userOrg) => userOrg.org.slug
    );
    if (newUserOrgs?.adminOrgSlugs?.includes(orgSlug)) {
      isUserAdminOfActiveOrg.value = true;
    } else {
      isUserAdminOfActiveOrg.value = false;
    }

    if (
      !userOrgSlugs?.includes(orgSlug) &&
      !userPersonalOrgSlug?.includes(orgSlug)
    ) {
      navigateTo(`/login`);
    }
  });

  const currentOrgProfile = computed(() => {
    if (userOrgs.value && userOrgs.value.userOrgs.length > 0) {
      return userOrgs.value.userOrgs.find((org) => org.org.slug === orgSlug)
        ?.org;
    }
    return null;
  });

  interface OrgButtons {
    slot: 'org';
    label: string;
    avatarId: string;
    slug: string;
    click: () => void;
  }
  const userOrgsButtons = ref<OrgButtons[]>([]);

  watch(userOrgs, (newVal) => {
    if (newVal && newVal.userOrgs.length > 0) {
      userOrgsButtons.value = [];
      for (const org of newVal.userOrgs) {
        userOrgsButtons.value.push({
          slot: 'org',
          label: org.org.name,
          //@ts-ignore
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
        avatarId: userProfile?.value?.profile?.avatarId || '',
        label:
          userProfile?.value?.profile?.firstName +
          ' ' +
          userProfile?.value?.profile?.lastName,
        slot: 'account'
      }
    ],
    userOrgsButtons.value,
    [
      {
        label: 'Personal Settings',
        icon: 'i-ph-user',
        click: () => {
          navigateTo(`/${orgSlug}/settings`);
        }
      },
      ...(isUserAdminOfActiveOrg.value
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
        icon: 'i-ph-book'
      },
      {
        label: 'Support',
        icon: 'i-ph-question'
      },
      {
        label: 'Roadmap',
        icon: 'i-ph-map-trifold'
      },
      {
        label: 'Changelog',
        icon: 'i-ph-megaphone'
      },
      {
        label: 'Status',
        icon: 'i-ph-activity'
      }
    ]
  ];

  const showLogoutModal = ref(false);
  const closeModal = () => {
    showLogoutModal.value = false;
  };
  async function useLogout() {
    if (process.server) {
      return null;
    }
    useHanko()?.session._cookie.removeAuthCookie();
    await useFetch('/api/logout', {
      method: 'POST'
    });
    navigateTo('/');
  }
</script>
<template>
  <div
    class="h-full max-h-full flex flex-col justify-between transition-all duration-300">
    <UnUiModal v-model="showLogoutModal">
      <template #header>
        <span class="">Logout</span>
      </template>
      <div class="w-full flex flex-col gap-8">
        <p>Are you sure you want to logout?</p>
        <div class="flex flex-row gap-4">
          <UnUiButton
            label="Cancel"
            size="xl"
            block
            @click="closeModal" />
          <UnUiButton
            label="Logout"
            size="xl"
            color="red"
            block
            @click="useLogout()" />
        </div>
      </div>
    </UnUiModal>
    <UnUiVerticalNavigation :links="navLinks"> </UnUiVerticalNavigation>

    <div class="flex flex-row justify-between">
      <NuxtUiDropdown
        :items="userMenuItems"
        :ui="{ item: { disabled: 'cursor-text select-text' } }"
        :popper="{ placement: 'top-start' }">
        <div
          class="max-w-[140px] w-[140px] flex flex-row items-center justify-between gap-2">
          <div class="w-full flex flex-row items-center gap-2 overflow-hidden">
            <UnUiAvatar
              :avatar-id="currentOrgProfile?.avatarId || ''"
              :alt="currentOrgProfile?.name"
              size="xs" />
            <span class="truncate text-sm">{{ currentOrgProfile?.name }}</span>
          </div>
          <UnUiIcon name="i-ph-caret-up" />
        </div>
        <template #account>
          <div class="flex flex-col gap-2 text-left">
            <p>Signed in as</p>
            <div
              class="w-full flex flex-row items-center gap-2 overflow-hidden">
              <UnUiAvatar
                :avatar-id="userProfile?.profile?.avatarId || ''"
                :alt="
                  userProfile?.profile?.firstName +
                  ' ' +
                  userProfile?.profile?.lastName
                " />
              <span class="truncate text-sm">{{
                userProfile?.profile?.firstName +
                ' ' +
                userProfile?.profile?.lastName
              }}</span>
            </div>
          </div>
        </template>
        <template #org="{ item }">
          <div class="max-w-full flex flex-row items-center gap-2">
            <UnUiAvatar
              :avatar-id="item.avatarId"
              :alt="item.label"
              color="gray"
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
            class="text-gray-400 dark:text-gray-500 ms-auto h-4 w-4 flex-shrink-0" />
        </template>
        <template #darkmode>
          <span class="truncate">{{ colorModeLabel }}</span>
          <UnUiIcon
            :name="colorModeIcon"
            class="text-gray-400 dark:text-gray-500 ms-auto h-4 w-4 flex-shrink-0" />
        </template>
        <template #helpmenu="{ item }">
          <NuxtUiDropdown
            :items="helpMenuItems"
            mode="hover"
            :ui="{ item: { disabled: 'cursor-text select-text' } }"
            :popper="{ offsetDistance: -5, placement: 'right-start' }"
            class="w-full">
            <div class="w-full flex flex-row justify-between">
              <span class="truncate">{{ item.label }}</span>
            </div>
            <template #item="{ item }">
              <span class="truncate">{{ item.label }}</span>
              <UnUiIcon
                :name="item.icon"
                class="text-gray-400 dark:text-gray-500 ms-auto h-4 w-4 flex-shrink-0" />
            </template>
          </NuxtUiDropdown>
          <UnUiIcon
            :name="item.icon"
            class="text-gray-400 dark:text-gray-500 ms-auto h-4 w-4 flex-shrink-0" />
        </template>
        <template #item="{ item }">
          <span class="truncate">{{ item.label }}</span>
          <UnUiIcon
            :name="item.icon"
            class="text-gray-400 dark:text-gray-500 ms-auto h-4 w-4 flex-shrink-0" />
        </template>
      </NuxtUiDropdown>
    </div>
  </div>
</template>
