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

  const imageUrlAccountHash = useRuntimeConfig().public.cfImagesAccountHash;
</script>
<template>
  <button
    class="p-2 rounded flex flex-row justify-start hover:bg-base-4 gap-2 overflow-hidden max-w-full w-full items-center"
    :class="props.isActive ? 'bg-base-5' : 'bg-base-2'">
    <div
      class="bg-cover bg-center font-display flex justify-center items-center w-[24px] h-[24px] rounded-xs"
      :style="
        props.orgData.org.avatarId
          ? `background-image: url(https://imagedelivery.net/${imageUrlAccountHash}/${props.orgData.org.avatarId}/32x32)`
          : ''
      ">
      {{ props.orgData.org.avatarId ? '' : props.orgData.org.name[0] }}
    </div>
    <span class="font-medium text-xs"> {{ props.orgData.org.name }}</span>
  </button>
</template>
