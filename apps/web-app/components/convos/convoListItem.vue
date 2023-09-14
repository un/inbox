<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  const { $trpc } = useNuxtApp();

  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type UserConvosDataType = PromiseType<
    ReturnType<typeof $trpc.convos.getUserConvos.query>
  >['data'];

  type Props = {
    convo: UserConvosDataType[number];
  };

  const props = defineProps<Props>();

  const imageUrlAccountHash = useRuntimeConfig().public.cfImagesAccountHash;

  const authorName = computed(() => {
    if (props.convo.messages[0].author.userProfile) {
      return (
        props.convo.messages[0].author.userProfile.firstName +
        ' ' +
        props.convo.messages[0].author.userProfile.lastName
      );
    }
    if (props.convo.messages[0].author.userGroup) {
      console.log(props.convo.messages[0].author.userGroup);
      return props.convo.messages[0].author.userGroup.name;
    }

    if (props.convo.messages[0].author.foreignEmailIdentity) {
      console.log(props.convo.messages[0].author.foreignEmailIdentity);
      return props.convo.messages[0].author.foreignEmailIdentity.senderName;
    }
    return '';
  });

  const authorAvatar = computed(() => {
    if (props.convo.messages[0].author.userProfile) {
      return props.convo.messages[0].author.userProfile.avatarId;
    }
    if (props.convo.messages[0].author.userGroup) {
      return props.convo.messages[0].author.userGroup.avatarId;
    }

    if (props.convo.messages[0].author.foreignEmailIdentity) {
      return props.convo.messages[0].author.foreignEmailIdentity.avatarId;
    }
    return '';
  });

  const authorColor = computed(() => {
    if (props.convo.messages[0].author.userGroup) {
      return props.convo.messages[0].author.userGroup.color;
    }
    return '';
  });
  const timeAgo = useTimeAgo(props.convo.lastUpdatedAt || new Date());
</script>
<template>
  <button
    class="p-4 rounded flex flex-col justify-between bg-base-2 hover:bg-base-4 gap-4 overflow-hidden max-w-full">
    <div class="flex flex-row gap-4 justify-between overflow-hidden w-full">
      <div
        class="text-xs text-left h-8 bg-base-1 rounded-full py-2 px-4 w-full overflow-hidden"
        v-for="subject of props.convo.subjects">
        <span class="truncate">{{ subject.subject }}</span>
      </div>
      <UnUiAvatar
        :avatar-id="props.convo.org.avatarId ? props.convo.org.avatarId : ''"
        :name="props.convo.org.name"
        tooltip-pre-text="Organization"
        size="tiny" />
    </div>
    <div class="flex flex-row gap-4 items-center">
      <UnUiAvatar
        :avatar-id="authorAvatar"
        :name="authorName"
        tooltip-pre-text="Author"
        size="md"
        :color="authorColor" />
      <div class="w-full overflow-hidden">
        <div class="text-sm text-left w-full overflow-hidden">
          <span class="line-clamp-2">{{ props.convo.messages[0].body }}</span>
        </div>
        <div class="text-xs text-left w-full overflow-hidden">
          <span class="">{{ timeAgo }}</span>
        </div>
      </div>
    </div>
    <div class="flex flex-row w-full gap-2 justify-end">
      <div v-for="member of props.convo.members">
        <UnUiAvatar
          :avatar-id="
            member.foreignEmailIdentity?.senderName
              ? member.foreignEmailIdentity?.avatarId
              : member.userGroup?.name
              ? member.userGroup?.avatarId
              : member.userProfile?.avatarId
          "
          :name="
            member.foreignEmailIdentity?.senderName
              ? member.foreignEmailIdentity?.senderName
              : member.userGroup?.name
              ? member.userGroup?.name
              : member.userProfile?.firstName +
                ' ' +
                member.userProfile?.lastName
          "
          :tooltip-pre-text="
            member.foreignEmailIdentity?.senderName
              ? 'External'
              : member.userGroup?.name
              ? 'Group'
              : 'User'
          "
          :color="member.userGroup?.name ? member.userGroup?.color : 'base'"
          size="xs" />
      </div>
    </div>
  </button>
</template>
