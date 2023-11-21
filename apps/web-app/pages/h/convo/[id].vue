<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  const { $trpc } = useNuxtApp();
  definePageMeta({
    layout: 'convos'
  });

  const convoPublicId = useRoute().params.id as string;
  const { data: convoDetails, pending } =
    await $trpc.convos.getConvo.useLazyQuery({
      convoPublicId: convoPublicId
    });

  if (!convoDetails.value?.data) navigateTo('/h/convo/404');
  const createDate = useTimeAgo(
    convoDetails.value?.data?.createdAt || new Date()
  );
  const updateDate = useTimeAgo(
    convoDetails.value?.data?.lastUpdatedAt || new Date()
  );

  type memberEntry = {
    avatarId: string;
    name: string;
    type: string;
    color:
      | 'red'
      | 'pink'
      | 'purple'
      | 'blue'
      | 'green'
      | 'orange'
      | 'yellow'
      | 'base';
  };

  const memberArray = ref<memberEntry[]>([]);
  if (!convoDetails.value?.data?.members) navigateTo('/h/convo/404');
  const convoMembers = convoDetails.value?.data?.members || [];
  for (const member of convoMembers) {
    memberArray.value.push({
      avatarId: member.foreignEmailIdentity?.avatarId
        ? member.foreignEmailIdentity?.avatarId
        : member.userGroup?.avatarId
          ? member.userGroup?.avatarId
          : member.userProfile?.avatarId
            ? member.userProfile?.avatarId
            : '',
      name: member.foreignEmailIdentity?.senderName
        ? member.foreignEmailIdentity?.senderName
        : member.userGroup?.name
          ? member.userGroup?.name
          : member.userProfile?.firstName
            ? member.userProfile?.firstName + ' ' + member.userProfile?.lastName
            : '',
      type: member.foreignEmailIdentity?.senderName
        ? 'External'
        : member.userGroup?.name
          ? 'Group'
          : 'User',
      color: member.userGroup?.color ? member.userGroup?.color : 'base'
    });
  }

  type AttachmentEntry = {
    name: string;
    publicId: string;
    type: string;
    url: string;
  };
  const attachments = ref<AttachmentEntry[]>([]);
  if (convoDetails.value?.data?.attachments) {
    for (const attachment of convoDetails.value?.data?.attachments) {
      const splitFileName = attachment.fileName.split('.');
      const newFileName =
        splitFileName[0].substring(0, 10) +
        '...' +
        splitFileName[splitFileName.length - 1];
      attachments.value.push({
        name: newFileName,
        publicId: attachment.publicId,
        type: attachment.type,
        url: attachment.storageId
      });
    }
  }

  // New Data
  const editorData = ref('');
</script>
<template>
  <div class="h-full max-h-full max-w-full w-full flex flex-col gap-2">
    <div
      class="max-w-full w-full flex flex-col justify-between gap-2 border-b-1 border-b-base-6 rounded rounded-tr-xl bg-base-3 p-4 pb-2">
      <div class="w-full flex flex-row items-center gap-2 overflow-hidden">
        <span class="text-sm">
          {{
            convoDetails?.data?.subjects.length !== 1 ? 'Subjects' : 'Subject'
          }}:
        </span>
        <div class="w-full flex flex-col gap-0 overflow-hidden">
          <span
            v-for="subject of convoDetails?.data?.subjects"
            class="truncate">
            {{ subject.subject }}
          </span>
        </div>
      </div>
      <div
        v-if="attachments.length > 0"
        class="max-w-full flex flex-row flex-wrap gap-2 overflow-hidden">
        <div v-for="attachment of attachments">
          <div
            class="flex flex-row gap-1 border border-1 border-base-5 rounded bg-base-2 px-2 py-1">
            <UnUiIcon
              name="i-ph-paperclip"
              size="16" />
            <span class="truncate text-xs"> {{ attachment.name }}</span>
          </div>
        </div>
      </div>

      <div class="w-full flex flex-row items-center justify-between gap-4">
        <div class="min-w-fit flex flex-row items-center gap-2">
          <div v-for="member of memberArray">
            <UnUiAvatar
              :avatar-id="member.avatarId"
              :name="member.name"
              :type="member.type"
              :color="member.color"
              size="sm" />
          </div>
        </div>
        <div class="min-w-fit flex flex-col">
          <span class="text-xs text-base-11">Started: {{ createDate }}</span>
          <span class="text-xs text-base-11">Updated: {{ updateDate }}</span>
        </div>
      </div>
    </div>
    <div class="h-full max-h-full flex grow flex-col gap-0 overflow-hidden">
      <div class="z-20000 mb-[-24px] h-[24px] from-base-1 bg-gradient-to-b" />
      <convos-convo-messages :convo-public-id="convoPublicId" />
      <div class="mt-[-24px] h-[24px] from-base-1 bg-gradient-to-t" />
    </div>
    <div class="max-h-[350px] w-full flex flex-row justify-items-end gap-2">
      <UnEditor v-model:modelValue="editorData" />
      <div class="min-w-fit flex flex-col justify-end gap-2">
        <UnUiButton
          label="Send"
          icon="ph-envelope"
          variant="outline" />
        <UnUiButton
          label="Note"
          color="orange"
          icon="ph-note"
          variant="outline" />
      </div>
    </div>
  </div>
</template>
