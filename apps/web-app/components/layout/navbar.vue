<script setup lang="ts">
  const localPrefs = useLocalPrefStore();
  const currentPath = ref(useRouter().currentRoute.value.path as string);

  const router = useRouter();
  router.beforeEach((to, from) => {
    currentPath.value = to.path;
  });

  const activeNav = computed(() => {
    if (currentPath.value === '/h') return 'convos';
    if (currentPath.value.startsWith('/h/convos')) return 'convos';
    if (currentPath.value.includes('/h/screener')) return 'screener';
    if (currentPath.value.includes('/h/feed')) return 'feed';
    if (currentPath.value.includes('/h/codes')) return 'codes';
    if (currentPath.value.includes('/settings')) return 'settings';
    if (currentPath.value.includes('/help')) return 'help';
    return '';
  });

  const navLinks = [
    {
      label: 'Conversations',
      to: '/h',
      icon: 'i-ph-chat-circle'
    },
    {
      label: 'Screener',
      to: '/h/screener',
      icon: 'i-ph-hand'
    },
    {
      label: 'Feed',
      to: '/h/feed',
      icon: 'i-ph-newspaper'
    },
    {
      label: 'Codes',
      to: '/h/codes',
      icon: 'i-ph-password'
    }
  ];
  const footerLinks = [
    {
      label: 'Settings',
      to: '/settings',
      icon: 'i-ph-gear'
    },
    {
      label: 'Help',
      to: '/help',
      icon: 'i-ph-question'
    }
  ];
</script>
<template>
  <div
    class="h-full max-h-full flex flex-col justify-between transition-all duration-300">
    <!-- :class="localPrefs.sidebarCollapsed ? 'w-[50px]' : 'w-64'"> -->
    <!-- <div class="flex flex-col gap-2">
      <nuxt-link
        to="/h"
        class="w-full overflow-hidden">
        <button
          class="w-full flex flex-row items-center justify-start gap-4 overflow-hidden rounded px-4 py-2 hover:bg-base-4"
          :class="activeNav === 'convos' ? 'bg-base-5' : ''"
          aria-label="Conversations">
          <UnUiIcon
            name="i-ph-chat-circle"
            size="1.25rem"
            class="min-w-[1.25rem]" />
          <p>Conversations</p>
        </button>
      </nuxt-link>
      <button
        class="w-full flex flex-row items-center justify-start gap-4 overflow-hidden rounded px-4 py-2 hover:bg-base-4"
        :class="activeNav === 'screener' ? 'bg-base-5' : ''">
        <UnUiIcon
          name="i-ph-hand"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Screener</p>
      </button>
      <button
        class="w-full flex flex-row items-center justify-start gap-4 overflow-hidden rounded px-4 py-2 hover:bg-base-4"
        :class="activeNav === 'feed' ? 'bg-base-5' : ''">
        <UnUiIcon
          name="i-ph-newspaper"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Feed</p>
      </button>
      <button
        class="w-full flex flex-row items-center justify-start gap-4 overflow-hidden rounded px-4 py-2 hover:bg-base-4"
        :class="activeNav === 'codes' ? 'bg-base-5' : ''">
        <UnUiIcon
          name="i-ph-password"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Codes</p>
      </button>
    </div> -->
    <UnUiVerticalNavigation :links="navLinks"> </UnUiVerticalNavigation>
    <UnUiVerticalNavigation :links="footerLinks"> </UnUiVerticalNavigation>
    <!-- <div class="flex flex-col gap-2">
      <nuxt-link
        to="/settings"
        class="w-full overflow-hidden">
        <button
          class="w-full flex flex-row items-center justify-start gap-4 overflow-hidden rounded px-4 py-2 hover:bg-base-4"
          :class="activeNav === 'settings' ? 'bg-base-5' : ''">
          <UnUiIcon
            name="i-ph-gear"
            size="1.25rem"
            class="min-w-[1.25rem]" />
          <p>Settings</p>
        </button>
      </nuxt-link>
      <button
        class="w-full flex flex-row items-center justify-start gap-4 overflow-hidden rounded px-4 py-2 hover:bg-base-4"
        :class="activeNav === 'help' ? 'bg-base-5' : ''"
        @click="localPrefs.toggleColorMode()">
        <UnUiIcon
          name="i-ph-question"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Help</p>
      </button>
      <button
        class="w-full flex flex-row items-center justify-start gap-4 overflow-hidden truncate rounded px-4 py-2 hover:bg-base-4"
        @click="localPrefs.toggleSidebar()">
        <UnUiIcon
          :name="
            localPrefs.sidebarCollapsed
              ? 'i-ph-caret-double-right'
              : 'i-ph-caret-double-left'
          "
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Close Sidebar</p>
      </button>
    </div> -->
  </div>
</template>
