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
</script>
<template>
  <div
    class="flex flex-col h-full max-h-full justify-between transition-all duration-300"
    :class="localPrefs.sidebarCollapsed ? 'w-[50px]' : 'w-64'">
    <div class="flex flex-col gap-2">
      <nuxt-link
        to="/h"
        class="overflow-hidden w-full">
        <button
          class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start w-full"
          :class="activeNav === 'convos' ? 'bg-base-5' : ''"
          aria-label="Conversations">
          <icon
            name="ph-chat-circle"
            size="1.25rem"
            class="min-w-[1.25rem]" />
          <p>Conversations</p>
        </button>
      </nuxt-link>
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start w-full"
        :class="activeNav === 'screener' ? 'bg-base-5' : ''">
        <icon
          name="ph-hand"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Screener</p>
      </button>
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start w-full"
        :class="activeNav === 'feed' ? 'bg-base-5' : ''">
        <icon
          name="ph-newspaper"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Feed</p>
      </button>
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start w-full"
        :class="activeNav === 'codes' ? 'bg-base-5' : ''">
        <icon
          name="ph-password"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Codes</p>
      </button>
    </div>
    <div class="flex flex-col gap-2">
      <nuxt-link
        to="/settings"
        class="overflow-hidden w-full">
        <button
          class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start w-full"
          :class="activeNav === 'settings' ? 'bg-base-5' : ''">
          <icon
            name="ph-gear"
            size="1.25rem"
            class="min-w-[1.25rem]" />
          <p>Settings</p>
        </button>
      </nuxt-link>
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start w-full"
        :class="activeNav === 'help' ? 'bg-base-5' : ''"
        @click="localPrefs.toggleColorMode()">
        <icon
          name="ph-question"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Help</p>
      </button>
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start w-full truncate"
        @click="localPrefs.toggleSidebar()">
        <icon
          :name="
            localPrefs.sidebarCollapsed
              ? 'ph-caret-double-right'
              : 'ph-caret-double-left'
          "
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Close Sidebar</p>
      </button>
    </div>
  </div>
</template>
