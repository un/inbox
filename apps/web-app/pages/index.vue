<script setup lang="ts">
  import { z } from 'zod';
  import { useMouse, useWindowSize } from '@vueuse/core';

  definePageMeta({
    layout: false
  });

  useSeoMeta({
    title: 'UnInbox',
    description: 'Open Source Email + Chat communication platform'
  });
  defineOgImageStatic({
    component: 'LandingOG',
    description: 'Open Source Email + Chat communication platform',
    sub: 'hey.com & front.com alternative',
    cta: 'Join the waitlist'
  });

  // Glow effect from https://learnvue.co
  const { x, y } = useMouse();
  const { width, height } = useWindowSize();
  const dx = computed(() => Math.abs(x.value - width.value / 2));
  const dy = computed(() => Math.abs(y.value - height.value / 2));
  const distance = computed(() =>
    Math.sqrt(dx.value * dx.value + dy.value * dy.value)
  );
  const size = computed(() => Math.max(400 - distance.value / 2, 150));
  const opacity = computed(() => Math.min(Math.max(size.value / 300, 0.7), 1));
  const logo = ref<HTMLElement>();
  const logoGradient = computed(() => {
    const rect = logo.value?.getBoundingClientRect();
    const xPos = x.value - (rect?.left ?? 0);
    const yPos = y.value - (rect?.top ?? 0);
    return `radial-gradient(circle at ${xPos}px ${yPos}px, black 30%, transparent 100%)`;
  });

  const email = ref('');
  const showConfirmation = ref(false);
  const invalidEmail = ref(false);
  const submitError = ref(false);
  const loading = ref(false);

  const toast = useToast();

  defineShortcuts({
    enter: {
      usingInput: 'emailInput',
      handler: () => {
        registerWaitlist();
      }
    }
  });

  async function registerWaitlist() {
    umTrackEvent('Signup');
    loading.value = true;
    const parsedEmail = z.string().email().safeParse(email.value);
    if (!parsedEmail.success) {
      loading.value = false;
      invalidEmail.value = true;
      return;
    }
    invalidEmail.value = false;
    const res = await $fetch('/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: email.value }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (res.error) {
      console.error(res.error);
      toast.add({
        title: 'Something went wrong 🐛',
        description: 'Please email us help@uninbox.com or reach out above',
        color: 'red',
        timeout: 90000
      });
      loading.value = false;
      submitError.value = true;
      showConfirmation.value = true;
    }
    if (res.success) {
      toast.add({
        title: "You're on the waitlist! 🎉",
        description:
          'Please check your email for confirmation, it should already be there 👀',
        color: 'green',
        timeout: 60000
      });
      showConfirmation.value = true;
      loading.value = false;
    }
  }
</script>

<template>
  <div
    class="w-screen h-screen bg-gradient-to-b from-black/5 to-sky-500/30 from-80% flex flex-col items-center justify-center relative overflow-hidden">
    <div
      class="absolute bg-sky-500/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none blur-3xl hidden md:visible"
      :style="{
        opacity,
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`
      }" />
    <div
      class="h-screen w-full flex flex-col items-center justify-center gap-8 z-10 overflow-auto p-5">
      <h1 class="font-display text-6xl md:text-9xl glow mt-24">UnInbox</h1>
      <div class="flex flex-col gap-2 items-center">
        <h2 class="text-lg text-center">
          Open Source <b>Email</b> + <b>Chat</b> communication platform
        </h2>
        <h3 class="text italic">hey.com & front.com alternative</h3>
      </div>
      <div
        class="flex flex-col md:flex-row gap-4 transition-all duration-600 cursor-none"
        :disabled="showConfirmation">
        <UInput
          v-model="email"
          icon="i-mdi-email-outline"
          type="email"
          :required="true"
          placeholder="hello@email.com"
          :disabled="showConfirmation"
          name="emailInput" />
        <UButton
          :disabled="showConfirmation"
          :loading="loading"
          loading-icon="i-mdi-refresh"
          @click="registerWaitlist()">
          Join Waitlist
        </UButton>
      </div>

      <UBadge
        v-if="invalidEmail"
        color="red"
        variant="solid">
        Invalid email address
      </UBadge>
      <UBadge
        v-if="submitError"
        color="red"
        variant="solid">
        Something went wrong, please contact us
      </UBadge>
      <div
        class="flex flex-col gap-4 items-center border-t-2 border-gray-400 pt-6 transition-all duration-1000"
        :class="!showConfirmation ? 'opacity-0 hidden' : 'opacity-100 visible'">
        <p
          v-if="!submitError"
          class="font-display text-2xl">
          Nice email!
        </p>
        <p v-if="!submitError">
          We've sent you a confirmation. In the mean time, heres how you can
          follow the progress.
        </p>
        <div class="flex gap-4 flex-col md:flex-row max-w-max">
          <div
            class="border-2 p-8 rounded-md border-gray-600 flex flex-col items-center gap-4 bg-blue-500/10 hover:border-gray-400 transition-colors cursor-pointer"
            @click="
              navigateTo('https://twitter.com/UnInbox', { external: true })
            ">
            <UIcon
              name="i-mdi-twitter
"
              class="text-4xl" />
            <p>Follow on Twitter</p>
          </div>
          <div
            class="border-2 p-8 rounded-md border-gray-600 flex flex-col items-center gap-4 bg-blue-500/10 hover:border-gray-400 transition-colors cursor-pointer"
            @click="
              navigateTo('https://discord.gg/QMV9p9sgza', { external: true })
            ">
            <UIcon
              name="i-mdi-discord
"
              class="text-4xl" />Join on Discord
          </div>
          <div
            class="border-2 p-8 rounded-md border-gray-600 flex flex-col items-center gap-4 bg-blue-500/10 hover:border-gray-400 transition-colors cursor-pointer"
            @click="
              navigateTo('https://github.com/uninbox/UnInbox', {
                external: true
              })
            ">
            <UIcon
              name="i-mdi-github
"
              class="text-4xl" />Star on GitHub
          </div>
          <div
            class="border-2 p-8 rounded-md border-gray-600 flex flex-col items-center gap-4 bg-blue-500/10 hover:border-gray-400 transition-colors cursor-pointer"
            @click="navigateTo('https://cal.com/mc/un', { external: true })">
            <p class="font-display text-3xl">Cal</p>
            Call on Cal.com
          </div>
        </div>
        <UBadge
          color="blue"
          variant="solid"
          size="lg"
          class="cursor-pointer"
          @click="navigateTo('/oss-friends', { external: true })">
          Check out our Open Source Friends. Life is better with friends, but
          even better open source!
        </UBadge>
      </div>
    </div>
  </div>
</template>
