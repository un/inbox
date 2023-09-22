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
    color: string;
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
  <div class="flex flex-col gap-2 h-full max-h-full w-full max-w-full">
    <div
      class="flex flex-col gap-2 border-b-1 border-b-base-6 pb-2 justify-between w-full max-w-full bg-base-3 rounded rounded-tr-xl p-4">
      <div class="flex flex-row gap-2 overflow-hidden w-full items-center">
        <span class="text-sm">
          {{
            convoDetails?.data?.subjects.length !== 1 ? 'Subjects' : 'Subject'
          }}:
        </span>
        <div class="flex flex-col gap-0 overflow-hidden w-full">
          <span
            class="truncate"
            v-for="subject of convoDetails?.data?.subjects">
            {{ subject.subject }}
          </span>
        </div>
      </div>
      <div
        class="flex flex-row max-w-full gap-2 overflow-hidden flex-wrap"
        v-if="attachments.length > 0">
        <div v-for="attachment of attachments">
          <div
            class="px-2 py-1 border border-1 border-base-5 rounded bg-base-2 flex flex-row gap-1">
            <Icon
              name="ph-paperclip"
              size="16" />
            <span class="text-xs truncate"> {{ attachment.name }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-row justify-between items-center gap-4 w-full">
        <div class="flex flex-row items-center gap-2 min-w-fit">
          <div v-for="member of memberArray">
            <UnUiAvatar
              :avatar-id="member.avatarId"
              :name="member.name"
              :type="member.type"
              :color="member.color"
              size="sm" />
          </div>
        </div>
        <div class="flex flex-col min-w-fit">
          <span class="text-xs text-base-11">Started: {{ createDate }}</span>
          <span class="text-xs text-base-11">Updated: {{ updateDate }}</span>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-0 grow overflow-hidden h-full max-h-full">
      <div class="h-[24px] mb-[-24px] bg-gradient-to-b from-base-1 z-20000" />
      <convos-convo-messages :convo-public-id="convoPublicId" />
      <div class="h-[24px] mt-[-24px] bg-gradient-to-t from-base-1" />
    </div>
    <div class="flex flex-row gap-2 justify-items-end w-full max-h-[350px]">
      <UnEditor v-model:modelValue="editorData" />
      <div class="flex flex-col gap-2 min-w-fit justify-end">
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
