<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  import { string } from 'zod';
  const { $trpc } = useNuxtApp();

  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type UserConvosDataType = PromiseType<
    ReturnType<typeof $trpc.convos.getUserConvos.query>
  >['data'];

  type Props = {
    convo: UserConvosDataType[number];
  };

  const props = defineProps<Props>();

  const timeAgo = useTimeAgo(props.convo.lastUpdatedAt || new Date());
  const authorName = computed(() => {
    if (
      props.convo.messages[0].author.userProfile?.firstName &&
      props.convo.messages[0].author.userProfile?.lastName
    ) {
      return (
        props.convo.messages[0].author.userProfile.firstName +
        ' ' +
        props.convo.messages[0].author.userProfile.lastName
      );
    }
    if (props.convo.messages[0].author.userGroup?.name) {
      return props.convo.messages[0].author.userGroup.name + ' Team';
    }

    if (props.convo.messages[0].author.foreignEmailIdentity?.senderName) {
      return props.convo.messages[0].author.foreignEmailIdentity.senderName;
    }
    return '';
  });

  const authorAvatar = computed(() => {
    if (props.convo.messages[0].author.userProfile?.avatarId) {
      return props.convo.messages[0].author.userProfile.avatarId;
    }
    if (props.convo.messages[0].author.userGroup?.avatarId) {
      return props.convo.messages[0].author.userGroup.avatarId;
    }

    if (props.convo.messages[0].author.foreignEmailIdentity?.avatarId) {
      return props.convo.messages[0].author.foreignEmailIdentity.avatarId;
    }
    return '';
  });

  const authorColor = computed(() => {
    if (props.convo.messages[0].author.userGroup?.color) {
      return props.convo.messages[0].author.userGroup.color;
    }
    return '';
  });

  type AuthorEntry = {
    avatarId: string;
    name: string;
    type: string;
    color: string;
  };
  const avatarArray = ref<AuthorEntry[]>([]);
  for (const author of props.convo.members) {
    avatarArray.value.push({
      avatarId: author.foreignEmailIdentity?.avatarId
        ? author.foreignEmailIdentity?.avatarId
        : author.userGroup?.avatarId
        ? author.userGroup?.avatarId
        : author.userProfile?.avatarId
        ? author.userProfile?.avatarId
        : '',
      name: author.foreignEmailIdentity?.senderName
        ? author.foreignEmailIdentity?.senderName
        : author.userGroup?.name
        ? author.userGroup?.name
        : author.userProfile?.firstName
        ? author.userProfile?.firstName + ' ' + author.userProfile?.lastName
        : '',
      type: author.foreignEmailIdentity?.senderName
        ? 'External'
        : author.userGroup?.name
        ? 'Group'
        : 'User',
      color: author.userGroup?.color ? author.userGroup?.color : 'base'
    });
  }
</script>
<template>
  <button
    class="p-4 rounded flex flex-col justify-between bg-base-3 hover:bg-base-4 gap-2 overflow-hidden max-w-full">
    <div class="flex flex-row gap-6 items-center w-full">
      <UnUiAvatarPlus
        :avatars="avatarArray"
        :primary="{
          avatarId: authorAvatar,
          name: authorName,
          type: 'User',
          color: authorColor
        }"
        size="lg" />
      <div class="w-full overflow-hidden flex flex-col gap-1">
        <!-- <div class="text-base text-left w-full overflow-hidden text-sm">
          <span class="line-clamp-2 font-bold">{{ authorName }}</span>
        </div> -->
        <div class="text-xs w-full text-left overflow-hidden">
          <span class="truncate text-xs font-italic"
            >Re: {{ props.convo.subjects[0].subject }}</span
          >
        </div>
        <div class="text-base text-left w-full overflow-hidden text-sm">
          <span class="line-clamp-2"
            ><span class="font-bold">{{ authorName }}</span
            >: {{ props.convo.messages[0].body }}</span
          >
        </div>
      </div>
    </div>
    <div class="flex flex-row w-full justify-end items-center gap-1">
      <!-- <div class="flex flex-row w-full gap-2 justify-start">
        <UnUiAvatarList
          :avatars="avatarArray"
          size="xs"
          :limit="2" />
      </div> -->
      <span class="text-xs text-base-11">in</span>
      <UnUiAvatar
        :avatar-id="props.convo.org.avatarId ? props.convo.org.avatarId : ''"
        :name="props.convo.org.name"
        tooltip-pre-text="Organization"
        size="tiny" />
      <div class="text-xs text-right min-w-fit overflow-hidden text-base-11">
        <span class="">{{ timeAgo }}</span>
      </div>
    </div>
  </button>
</template>
