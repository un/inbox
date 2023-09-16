<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  const { $trpc } = useNuxtApp();

  type PromiseType<T> = T extends Promise<infer U> ? U : never;
  type ConvoMessageDataType = PromiseType<
    ReturnType<typeof $trpc.convos.getConvoMessages.query>
  >['messages'];

  type ConvoMessageItem = NonNullable<ConvoMessageDataType>[number];
  type Props = {
    message: ConvoMessageItem;
  };

  const props = defineProps<Props>();

  const timeAgo = useTimeAgo(props.message.createdAt || new Date());
  // const authorName = computed(() => {
  //   if (
  //     props.convo.messages[0].author.userProfile?.firstName &&
  //     props.convo.messages[0].author.userProfile?.lastName
  //   ) {
  //     return (
  //       props.convo.messages[0].author.userProfile.firstName +
  //       ' ' +
  //       props.convo.messages[0].author.userProfile.lastName
  //     );
  //   }
  //   if (props.convo.messages[0].author.userGroup?.name) {
  //     return props.convo.messages[0].author.userGroup.name + ' Team';
  //   }

  //   if (props.convo.messages[0].author.foreignEmailIdentity?.senderName) {
  //     return props.convo.messages[0].author.foreignEmailIdentity.senderName;
  //   }
  //   return '';
  // });

  // const authorAvatar = computed(() => {
  //   if (props.convo.messages[0].author.userProfile?.avatarId) {
  //     return props.convo.messages[0].author.userProfile.avatarId;
  //   }
  //   if (props.convo.messages[0].author.userGroup?.avatarId) {
  //     return props.convo.messages[0].author.userGroup.avatarId;
  //   }

  //   if (props.convo.messages[0].author.foreignEmailIdentity?.avatarId) {
  //     return props.convo.messages[0].author.foreignEmailIdentity.avatarId;
  //   }
  //   return '';
  // });

  // const authorColor = computed(() => {
  //   if (props.convo.messages[0].author.userGroup?.color) {
  //     return props.convo.messages[0].author.userGroup.color;
  //   }
  //   return '';
  // });

  // type AuthorEntry = {
  //   avatarId: string;
  //   name: string;
  //   type: string;
  //   color: string;
  // };
  // const avatarArray = ref<AuthorEntry[]>([]);
  // for (const author of props.convo.members) {
  //   avatarArray.value.push({
  //     avatarId: author.foreignEmailIdentity?.avatarId
  //       ? author.foreignEmailIdentity?.avatarId
  //       : author.userGroup?.avatarId
  //       ? author.userGroup?.avatarId
  //       : author.userProfile?.avatarId
  //       ? author.userProfile?.avatarId
  //       : '',
  //     name: author.foreignEmailIdentity?.senderName
  //       ? author.foreignEmailIdentity?.senderName
  //       : author.userGroup?.name
  //       ? author.userGroup?.name
  //       : author.userProfile?.firstName
  //       ? author.userProfile?.firstName + ' ' + author.userProfile?.lastName
  //       : '',
  //     type: author.foreignEmailIdentity?.senderName
  //       ? 'External'
  //       : author.userGroup?.name
  //       ? 'Group'
  //       : 'User',
  //     color: author.userGroup?.color ? author.userGroup?.color : 'base'
  //   });
  // }
</script>
<template>
  <div class="flex flex-row gap-4">
    <div
      class="p-4 rounded flex flex-col justify-between bg-base-3 hover:bg-base-4 gap-2 overflow-hidden max-w-[80%] w-full">
      <div class="flex flex-row gap-6 items-center w-full">
        {{ props.message.body }}
      </div>
      <div class="flex flex-row w-full justify-end items-center gap-1">
        {{ props.message.author }}
      </div>
      <div class="flex flex-row w-full justify-end items-center gap-1">
        {{ timeAgo }} {{ props.message.createdAt }}
      </div>
    </div>
  </div>
</template>
