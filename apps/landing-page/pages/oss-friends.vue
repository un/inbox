<script setup lang="ts">
  useSeoMeta({
    title: 'UnInbox - OSS Friends',
    description: 'Our amazing open source friends'
  });
  defineOgImageStatic({
    component: 'LandingOG',
    description: 'Our amazing open source friends',
    sub: 'Open Source Email + Chat communication platform'
  });

  const { data: OSSFriends } = await useFetch('/api/oss');
  const ossFriendsData = computed(() => {
    return OSSFriends.value ? OSSFriends.value['data'] : [];
  });
</script>

<template>
  <ULandingSection
    title="Our Open Source Friends"
    description="We believe in a better and more sustainable future powered by Open
        Source software. Below you can find a list of our friends who are just
        as passionate about open source and the future as we are."
    :ui="{ title: 'font-display' }">
    <UPageGrid
      id="way"
      class="scroll-mt-[calc(var(--header-height)+140px+128px+96px)]">
      <ULandingCard
        v-for="(item, index) in ossFriendsData"
        :key="index"
        :to="item.href"
        :title="item.name"
        :description="item.description">
        <UBadge
          v-if="item"
          variant="subtle"
          size="sm"
          class="absolute right-2 top-2">
          {{ item.href }}
        </UBadge>
      </ULandingCard>
    </UPageGrid>
  </ULandingSection>
</template>
