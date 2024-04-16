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
  const orgShortcode = useRoute().params.orgShortcode as string;
  const router = useRouter();
  router.beforeEach((to) => {
    currentPath.value = to.path;
  });

  const navLinks = [
    {
      label: 'Conversations',
      to: `/${orgShortcode}/convo`,
      icon: 'i-ph-chat-circle'
    },
    {
      label: 'Contacts',
      // to: `/${orgShortcode}/screener`,
      icon: 'i-ph-address-book',
      tooltip: 'Manage your contacts',
      disabled: true,
      badge: 'Soon'
    },
    {
      label: 'Group Convos',
      // to: `/${orgShortcode}/convo`,
      tooltip: 'Separate your group and personal conversations',
      icon: 'i-ph-chats-circle',

      disabled: true,
      badge: 'Soon'
    },
    {
      label: 'Screener',
      // to: `/${orgShortcode}/screener`,
      tooltip: 'Set who can or cant email you',
      icon: 'i-ph-hand',
      disabled: true,
      badge: 'Soon'
    },
    {
      label: 'Feed',
      // to: `/${orgShortcode}/feed`,
      tooltip:
        'All your newsletters, marketing messages, and product updates in one place',
      icon: 'i-ph-newspaper',
      disabled: true,
      badge: 'Soon'
    },
    {
      label: 'Codes',
      // to: `/${orgShortcode}/codes`,
      tooltip: 'Easily copy your login or verification codes',
      icon: 'i-ph-password',
      disabled: true,
      badge: 'Soon'
    }
  ];

  const { $trpc } = useNuxtApp();

  const { data: orgMemberProfile } =
    $trpc.account.profile.getOrgMemberProfile.useLazyQuery(
      { orgShortcode: orgShortcode },
      { server: false, queryKey: 'getOrgMemberSingleProfileNav' }
    );

  const { data: accountOrgs } =
    await $trpc.org.crud.getAccountOrgs.useLazyQuery(
      {},
      { server: false, queryKey: 'getUserOrgsNav' }
    );

  watch(accountOrgs, (newUserOrgs) => {
    const userOrgShortcodes = newUserOrgs?.userOrgs.map(
      (userOrg) => userOrg.org.shortcode
    );

    if (!userOrgShortcodes?.includes(orgShortcode)) {
      navigateTo(`/redirect`);
    }
  });

  const currentOrgProfile = computed(() => {
    if (accountOrgs.value && accountOrgs.value.userOrgs.length > 0) {
      return accountOrgs.value.userOrgs.find(
        (org) => org.org.shortcode === orgShortcode
      )?.org;
    }
    return null;
  });

  interface OrgButtons {
    slot: 'org';
    label: string;
    publicId: string;
    avatarTimestamp: Date | null;
    shortcode: string;
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
          avatarTimestamp: org.org.avatarTimestamp,
          shortcode: org.org.shortcode,
          click: () => {
            navigateTo(`/${org.org.shortcode}`);
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
        label: 'Settings',
        icon: 'i-ph-gear',
        click: () => {
          navigateTo(`/${orgShortcode}/settings`);
        }
      },
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
        disabled: false,
        click: () => {
          navigateTo(`https://guide.uninbox.com/`, {
            external: true,
            open: { target: '_blank' }
          });
        }
      },
      {
        label: 'Support',
        icon: 'i-ph-question',
        disabled: false,
        click: () => {
          showSupportModal.value = true;
        }
      },
      {
        label: 'Roadmap',
        icon: 'i-ph-map-trifold',
        disabled: false,
        click: () => {
          navigateTo(`https://guide.uninbox.com/`, {
            external: true,
            open: { target: '_blank' }
          });
        }
      },
      {
        label: 'Changelog',
        icon: 'i-ph-megaphone',
        disabled: false,
        click: () => {
          navigateTo(`https://guide.uninbox.com/`, {
            external: true,
            open: { target: '_blank' }
          });
        }
      },
      {
        label: 'Status',
        icon: 'i-ph-activity',
        disabled: false,
        click: () => {
          navigateTo(`https://guide.uninbox.com/`, {
            external: true,
            open: { target: '_blank' }
          });
        }
      }
    ]
  ];

  const showSupportModal = ref(false);

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
      timeout: 1000
    });
  }
</script>
<template>
  <div
    class="bg-base-2 border-base-7 flex h-full max-h-full w-[320px] flex-col justify-between gap-4 border-r p-4 transition-all duration-300">
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
    <UnUiModal v-model="showSupportModal">
      <template #header>
        <span class="">Support</span>
      </template>
      <div class="flex w-full flex-col gap-4">
        <p>We're still setting up our full support systems</p>
        <p>You can either email our team</p>
        <div class="flex flex-row gap-2">
          <span>support@uninbox.com</span>
          <UnUiCopy
            icon="i-ph-envelope"
            size="xs"
            variant="soft"
            color="base"
            helper="Copy Email Address"
            text="support@uninbox.com"
            >Email
          </UnUiCopy>
        </div>

        <p>Or via one of these methods here:</p>
        <div class="flex w-full flex-row gap-4">
          <UnUiButton
            label="Github issues"
            @click="
              navigateTo(`https://github.com/un/inbox/`, {
                external: true,
                open: { target: '_blank' }
              })
            " />
          <UnUiButton
            label="Join community on discord"
            @click="
              navigateTo(`https://discord.gg/U6tJCqgRm9`, {
                external: true,
                open: { target: '_blank' }
              })
            " />
        </div>
      </div>
    </UnUiModal>
    <div class="flex flex-col gap-4">
      <div class="flex flex-row items-center justify-between pl-2 pr-2">
        <span class="font-display leading-none">UnInbox</span>
      </div>
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
    </div>
    <div class="flex w-full flex-col place-self-end">
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
              v-if="currentOrgProfile"
              :public-id="currentOrgProfile?.publicId"
              :avatar-timestamp="currentOrgProfile?.avatarTimestamp || null"
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
            <div
              class="flex w-full flex-row items-center gap-2 overflow-hidden">
              <UnUiAvatar
                v-if="orgMemberProfile"
                :public-id="orgMemberProfile?.profile?.publicId"
                :avatar-timestamp="
                  orgMemberProfile?.profile?.avatarTimestamp || null
                "
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
              :avatar-timestamp="item.avatarTimestamp"
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
            v-if="item.shortcode === orgShortcode"
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
  </div>
</template>
