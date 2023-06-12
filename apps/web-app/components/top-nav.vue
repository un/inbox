<template>
  <div class="m-4 w-auto flex flex-row justify-between">
    <div class="font-display text-3xl cursor-pointer p-1" @click="navigateTo('/')">UnInbox</div>
    <div class="flex flex-row gap-4 items-center">
      <UTooltip text="Star on GitHub"
        ><UIcon
          name="i-mdi-github"
          class="text-2xl"
          @click="navigateTo('https://github.com/uninbox/UnInbox', { external: true })"
      /></UTooltip>
      <UTooltip text="Follow on Twitter"
        ><UIcon
          name="i-mdi-twitter"
          class="text-2xl"
          @click="navigateTo('https://twitter.com/UnInbox', { external: true })"
      /></UTooltip>
      <UTooltip text="Join on Discord"
        ><UIcon
          name="i-mdi-discord"
          class="text-2xl"
          @click="navigateTo('https://discord.gg/QMV9p9sgza', { external: true })"
      /></UTooltip>
      <UTooltip text="Call on Cal.com"
        ><div class="font-display text-2xl" @click="navigateTo('https://cal.com/mc/un', { external: true })">
          Cal
        </div></UTooltip
      >
    </div>
  </div>
</template>
