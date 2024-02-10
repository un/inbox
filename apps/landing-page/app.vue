<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  ogSiteName: 'Nuxt UI Pro - Landing template',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <Header />

  <UMain>
    <NuxtPage />
  </UMain>

  <Footer />
</template>
