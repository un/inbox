<script setup land="ts">
  const colorMode = useColorMode();
  const isDark = computed({
    get() {
      return colorMode.value === 'dark';
    },
    set() {
      colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
    }
  });
</script>
<template>
  <div
    class="m-4 w-auto flex flex-col gap-4 items-center md:flex-row justify-between">
    <div
      class="font-display text-3xl cursor-pointer p-1"
      @click="navigateTo('/')">
      UnInbox
    </div>
    <div class="flex flex-row gap-8 items-center">
      <div
        class="cursor-pointer"
        @click="navigateTo('/a/manifesto')">
        MANIFESTO
      </div>
      <div
        class="cursor-pointer"
        @click="navigateTo('/oss-friends')">
        OSS FRIENDS
      </div>
    </div>
    <div class="flex flex-row gap-4 items-center">
      <UTooltip text="Star on GitHub"
        ><UIcon
          name="i-mdi-github"
          class="text-2xl cursor-pointer"
          @click="
            navigateTo('https://github.com/uninbox/UnInbox', { external: true })
          "
      /></UTooltip>
      <UTooltip text="Follow on Twitter"
        ><UIcon
          name="i-mdi-twitter"
          class="text-2xl cursor-pointer"
          @click="
            navigateTo('https://twitter.com/UnInbox', { external: true })
          "
      /></UTooltip>
      <UTooltip text="Join on Discord"
        ><UIcon
          name="i-mdi-discord"
          class="text-2xl cursor-pointer"
          @click="
            navigateTo('https://discord.gg/QMV9p9sgza', { external: true })
          "
      /></UTooltip>
      <UTooltip text="Call on Cal.com"
        ><div
          class="font-display text-2xl cursor-pointer"
          @click="navigateTo('https://cal.com/mc/un', { external: true })">
          Cal
        </div></UTooltip
      >
      <ClientOnly>
        <UButton
          :icon="isDark ? 'i-mdi-weather-night' : 'i-mdi-white-balance-sunny'"
          color="gray"
          variant="ghost"
          aria-label="Theme"
          class=""
          @click="isDark = !isDark" />

        <template #fallback>
          <div class="w-8 h-8" />
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
