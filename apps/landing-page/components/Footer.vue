<script setup lang="ts">
  const emit = defineEmits(['openWaitlistModal']);
  // const links = [{
  //   label: 'Resources',
  //   children: [{
  //     label: 'Help center'
  //   }, {
  //     label: 'Docs'
  //   }, {
  //     label: 'Roadmap'
  //   }, {
  //     label: 'Changelog'
  //   }]
  // }, {
  //   label: 'Features',
  //   children: [{
  //     label: 'Affiliates'
  //   }, {
  //     label: 'Portal'
  //   }, {
  //     label: 'Jobs'
  //   }, {
  //     label: 'Sponsors'
  //   }]
  // }, {
  //   label: 'Company',
  //   children: [{
  //     label: 'About'
  //   }, {
  //     label: 'Pricing'
  //   }, {
  //     label: 'Careers'
  //   }, {
  //     label: 'Blog'
  //   }]
  // }]

  const toast = useToast();

  // const email = ref('')
  // const loading = ref(false)

  // function onSubmit () {
  //   loading.value = true

  //   setTimeout(() => {
  //     toast.add({
  //       title: 'Subscribed!',
  //       description: 'You\'ve been subscribed to our newsletter.'
  //     })

  //     loading.value = false
  //   }, 1000)
  // }
</script>

<template>
  <UFooter>
    <template #top>
      <!-- <UFooterColumns :links="links">
        <template #right>
          <form @submit.prevent="onSubmit">
            <UFormGroup label="Subscribe to our newsletter" :ui="{ container: 'mt-3' }">
              <UInput v-model="email" type="email" placeholder="Enter your email" :ui="{ icon: { trailing: { pointer: '' } } }" required size="xl" autocomplete="off" class="max-w-sm">
                <template #trailing>
                  <UButton type="submit" size="xs" :label="loading ? 'Subscribing' : 'Subscribe'" :loading="loading" />
                </template>
              </UInput>
            </UFormGroup>
          </form>
        </template>
      </UFooterColumns> -->
    </template>

    <template #left>
      <p class="text-gray-500 dark:text-gray-400 text-sm">
        Copyright © {{ new Date().getFullYear() }}. All rights reserved.
      </p>
    </template>

    <template #right>
      <UButton
        color="black"
        icon="i-simple-icons-github"
        class="hidden lg:flex"
        to="https://github.com/uninbox/UnInbox"
        variant="ghost"
        :target="'_blank'" />
      <UButton
        color="black"
        icon="i-simple-icons-discord"
        to="https://discord.gg/dGBff6zBwQ"
        :target="'_blank'"
        variant="ghost"
        class="hidden lg:flex" />
      <UButton
        color="black"
        icon="i-simple-icons-x"
        to="https://x.com/uninbox"
        :target="'_blank'"
        variant="ghost"
        class="hidden lg:flex" />

      <UButton
        label="Join the waitlist"
        color="black"
        variant="ghost"
        icon="i-heroicons-rocket-launch"
        class="hidden lg:flex"
        @click="$emit('openWaitlistModal')" />
    </template>
  </UFooter>
</template>
