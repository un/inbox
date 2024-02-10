<script setup lang="ts">
  import { z } from 'zod';
  useHead({
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1' }
    ],
    link: [{ rel: 'icon', href: '/favicon.ico' }],
    htmlAttrs: {
      lang: 'en'
    }
  });

  useSeoMeta({
    ogSiteName: 'UnInbox',
    ogDescription:
      'Modern email for teams and professionals. 100% Open Source.',
    twitterCard: 'summary_large_image'
  });

  // Waitlist stuffs
  const showWaitlistModal = ref(false);
  const email = ref('');
  const validEmail = ref(false);
  const submitError = ref(false);
  const loading = ref(false);

  const toast = useToast();
  const zodSchema = z.string().email();

  watchDebounced(
    email,
    async () => {
      const parsedEmail = z.string().email().safeParse(email.value);
      if (!parsedEmail.success) {
        loading.value = false;
        validEmail.value = false;
        return;
      }
      validEmail.value = true;
    },
    {
      debounce: 500,
      maxWait: 5000
    }
  );

  async function registerWaitlist() {
    loading.value = true;
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
      showWaitlistModal.value = false;
    }
    if (res.success) {
      toast.add({
        title: "You're on the waitlist! 🎉",
        description:
          'Please check your email for confirmation, it should already be there 👀',
        color: 'green',
        timeout: 60000
      });
      showWaitlistModal.value = false;
      loading.value = false;
    }
  }
</script>

<template>
  <div class="h-full w-full">
    <Header @open-waitlist-modal="() => (showWaitlistModal = true)" />
    <UModal
      v-model="showWaitlistModal"
      class="max-w-md">
      <UCard>
        <template #header>
          <div class="flex flex-row items-center justify-between">
            <h2 class="text-2xl font-display">Join the waitlist</h2>
            <UButton
              icon="i-ph-x"
              color="black"
              size="sm"
              @click="() => (showWaitlistModal = false)" />
          </div>
        </template>
        <div class="flex flex-col gap-2">
          <UFormGroup
            label="Email Address"
            :error="!validEmail">
            <UInput
              v-model="email"
              type="email"
              placeholder="Enter your email"
              :error="!validEmail"
              :disabled="loading"
              required
              size="lg"
              autocomplete="off"
              class="max-w-sm" />
          </UFormGroup>
          <p class="text-gray-500 text-sm">
            We'll email you when we're ready to launch. No spam, we promise.
          </p>
        </div>
        <template #footer>
          <UButton
            label="Join"
            color="black"
            size="lg"
            :disabled="!validEmail || loading"
            :loading="loading"
            @click="registerWaitlist()" />
        </template>
        <template #close> </template>
      </UCard>
    </UModal>
    <UMain>
      <NuxtPage @open-waitlist-modal="() => (showWaitlistModal = true)" />
    </UMain>
    <Footer @open-waitlist-modal="() => (showWaitlistModal = true)" />
    <UNotifications />
  </div>
</template>
