<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';

  const { $trpc } = useNuxtApp();

  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type UserOrgMembershipData = PromiseType<
    ReturnType<typeof $trpc.org.settings.getUserOrgs.query>
  >['userOrgs'];

  type Props = {
    orgData: UserOrgMembershipData[number];
    isActive: boolean;
  };

  const props = defineProps<Props>();
</script>
<template>
  <button
    class="max-w-full w-full flex flex-row items-center justify-start gap-2 overflow-hidden rounded p-2 hover:bg-base-4"
    :class="props.isActive ? 'bg-base-5' : 'bg-base-2'">
    <UnUiAvatar
      :public-id="props.orgData.org.publicId"
      :type="'org'"
      :size="'md'"
      :alt="props.orgData.org.name" />
    <span class="text-xs font-medium"> {{ props.orgData.org.name }}</span>
  </button>
</template>
