<script setup lang="ts">
  const nuxtApp = useNuxtApp();
  const { activeHeadings, updateHeadings } = useScrollspy();

  const emit = defineEmits(['openWaitlistModal']);
  const links = computed(() => [
    {
      label: 'What',
      to: '#way',
      icon: 'i-heroicons-cube-transparent',
      active:
        activeHeadings.value.includes('way') &&
        !activeHeadings.value.includes('features')
    },
    {
      label: 'Features',
      to: '#features',
      icon: 'i-heroicons-cube-transparent',
      active:
        activeHeadings.value.includes('features') &&
        !activeHeadings.value.includes('pricing')
    },
    {
      label: 'Pricing',
      to: '#pricing',
      icon: 'i-heroicons-credit-card',
      active:
        activeHeadings.value.includes('pricing') &&
        !activeHeadings.value.includes('testimonials')
    },
    // {
    //   label: 'Testimonials',
    //   to: '#testimonials',
    //   icon: 'i-heroicons-academic-cap',
    //   active: activeHeadings.value.includes('testimonials')
    // },
    {
      label: 'FAQ',
      to: '#faq',
      icon: 'i-heroicons-question-mark-circle',
      active: activeHeadings.value.includes('faq')
    }
  ]);

  nuxtApp.hooks.hookOnce('page:finish', () => {
    updateHeadings([
      document.querySelector('#way'),
      document.querySelector('#features'),
      document.querySelector('#pricing'),
      document.querySelector('#faq')
    ]);
  });
</script>

<template>
  <UHeader :links="links">
    <template #logo>
      <span class="font-display"> UnInbox </span>
      <UBadge
        label="Coming Soon"
        variant="subtle"
        class="mb-0.5" />
    </template>

    <template #right>
      <UColorModeButton />
      <UButton
        color="black"
        icon="i-simple-icons-github"
        class="hidden lg:flex"
        to="https://github.com/uninbox/UnInbox"
        :target="'_blank'" />
      <UButton
        color="black"
        icon="i-simple-icons-discord"
        to="https://discord.gg/dGBff6zBwQ"
        :target="'_blank'"
        class="hidden lg:flex" />
      <UButton
        color="black"
        icon="i-simple-icons-x"
        to="https://x.com/uninbox"
        :target="'_blank'"
        class="hidden lg:flex" />

      <UButton
        label="Join the waitlist"
        color="black"
        icon="i-heroicons-rocket-launch"
        class="hidden lg:flex"
        @click="$emit('openWaitlistModal')" />
    </template>

    <template #panel>
      <UAsideLinks :links="links" />

      <UDivider class="my-6" />

      <UButton
        color="black"
        icon="i-simple-icons-github"
        class="hidden lg:flex"
        to="https://github.com/uninbox/UnInbox"
        :target="'_blank'" />
      <UButton
        color="black"
        icon="i-simple-icons-discord"
        to="https://discord.gg/dGBff6zBwQ"
        :target="'_blank'"
        class="hidden lg:flex" />
      <UButton
        color="black"
        icon="i-simple-icons-x"
        to="https://x.com/uninbox"
        :target="'_blank'"
        class="hidden lg:flex" />

      <UButton
        label="Join the waitlist"
        color="black"
        icon="i-heroicons-rocket-launch"
        class="hidden lg:flex"
        @click="$emit('openWaitlistModal')" />
    </template>
  </UHeader>
</template>
