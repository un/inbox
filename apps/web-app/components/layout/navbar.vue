<script setup lang="ts">
  const localPrefs = useLocalPrefStore();
</script>
<template>
  <div
    class="flex flex-col h-full max-h-full justify-between transition-all duration-300"
    :class="localPrefs.sidebarCollapsed ? 'w-[50px]' : 'w-64'">
    <div class="flex flex-col gap-2">
      <button
        class="flex flex-row gap-4 py-2 px-4 bg-base-5 rounded hover:bg-base-4 items-center bg-base-3 overflow-hidden justify-start"
        aria-label="Conversations">
        <icon
          name="ph-chat-circle"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Conversations</p>
      </button>
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start">
        <icon
          name="ph-hand"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Screener</p>
      </button>
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start">
        <icon
          name="ph-newspaper"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Feed</p>
      </button>
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start">
        <icon
          name="ph-password"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Codes</p>
      </button>
    </div>
    <div class="flex flex-col gap-2">
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start">
        <icon
          name="ph-gear"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Settings</p>
      </button>
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start"
        @click="localPrefs.toggleColorMode()">
        <icon
          name="ph-question"
          size="1.25rem"
          class="min-w-[1.25rem]" />
        <p>Help</p>
      </button>
      <button
        class="flex flex-row gap-4 py-2 px-4 rounded hover:bg-base-4 items-center overflow-hidden justify-start truncate"
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
