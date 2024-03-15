<script setup lang="ts">
  import { useTimeAgo } from '@vueuse/core';
  import type { ConvoParticipantEntry } from '~/composables/types';

  const { $trpc } = useNuxtApp();

  type AttachmentEntry = {
    name: string;
    publicId: string;
    type: string;
    url: string;
  };

  const convoParticiapntsCollapsed = ref(true);
  const attachmentsCollapsed = ref(true);
  const participantPublicId = ref('');
  const participantArray = ref<ConvoParticipantEntry[]>([]);
  const participantsAssignedArray = ref<ConvoParticipantEntry[]>([]);
  const participantContributorsArray = ref<ConvoParticipantEntry[]>([]);
  const participantCommentersArray = ref<ConvoParticipantEntry[]>([]);
  const participantWatchersArray = ref<ConvoParticipantEntry[]>([]);
  const participantGuestsArray = ref<ConvoParticipantEntry[]>([]);
  const attachments = ref<AttachmentEntry[]>([]);
  const subjectsArray = ref<string[]>([]);
  const createDate = ref<Date | null>(null);
  const updateDate = ref<Date | null>(null);
  const createdAgo = ref('');
  const updatedAgo = ref('');

  const orgSlug = useRoute().params.orgSlug as string;
  const convoPublicId = useRoute().params.id as string;
  const { data: convoDetails, status: convoDetailsStatus } =
    await $trpc.convos.getConvo.useLazyQuery(
      {
        convoPublicId: convoPublicId
      },
      { server: false, queryKey: `convoDetails-${convoPublicId}` }
    );

  watch(convoDetails, () => {
    if (convoDetailsStatus.value === 'idle') return;
    if (convoDetailsStatus.value === 'success') {
      if (!convoDetails.value?.data) {
        navigateTo(`/${orgSlug}/convo/404`);
      }
      if (!convoDetails.value?.data?.participants) {
        navigateTo(`/${orgSlug}/convo/404`);
      }
    }

    createDate.value = convoDetails.value?.data?.createdAt || new Date();
    updateDate.value =
      convoDetails.value?.data?.lastUpdatedAt ||
      convoDetails.value?.data?.createdAt ||
      new Date();
    // Ensure createDate and updateDate are always Date objects before passing to useTimeAgo
    createdAgo.value = useTimeAgo(
      createDate.value ? createDate.value : new Date()
    ).value;
    updatedAgo.value = useTimeAgo(
      updateDate.value ? updateDate.value : new Date()
    ).value;

    const convoParticipants = convoDetails.value?.data?.participants || [];
    for (const participant of convoParticipants) {
      const {
        participantPublicId,
        participantTypePublicId,
        avatarPublicId,
        participantName,
        participantType,
        participantColor,
        participantRole
      } = useUtils().convos.useParticipantData(participant);
      const participantData: ConvoParticipantEntry = {
        participantPublicId: participantPublicId,
        typePublicId: participantTypePublicId,
        avatarPublicId: avatarPublicId,
        name: participantName,
        type: participantType,
        role: participant.role,
        color: participantColor
      };

      participantArray.value.push(participantData);
      if (participant.role === 'assigned')
        participantsAssignedArray.value.push(participantData);
      if (participant.role === 'contributor')
        participantContributorsArray.value.push(participantData);
      if (participant.role === 'commenter')
        participantCommentersArray.value.push(participantData);
      if (participant.role === 'watcher')
        participantWatchersArray.value.push(participantData);
      if (participant.role === 'guest')
        participantGuestsArray.value.push(participantData);
    }

    if (
      convoDetails.value &&
      convoDetails.value.data &&
      convoDetails.value.data.attachments
    ) {
      for (const attachment of convoDetails.value.data.attachments) {
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
    participantPublicId.value = convoDetails.value?.participantPublicId || '';
  });
  provide('convoParticipants', participantArray);
  provide('participantPublicId', participantPublicId);

  const findParticipant = (participantPublicId: string) => {
    return participantArray.value.find(
      (participant) => participant.participantPublicId === participantPublicId
    );
  };

  // // New Data
  const editorData = ref({});
</script>
<template>
  <div
    class="flex h-full max-h-full w-full max-w-full flex-col gap-2 overflow-hidden">
    <div
      class="flex w-full max-w-full flex-row items-center justify-between gap-2">
      <div class="flex flex-row gap-2">
        <template
          v-for="subject of convoDetails?.data?.subjects"
          :key="subject.publicId">
          <span
            class="truncate rounded-xl bg-gray-100 px-4 py-2 text-lg dark:bg-gray-800">
            {{ subject.subject }}
          </span>
        </template>
        <!-- <span>TAGS</span> -->
      </div>

      <div class="flex h-fit flex-row gap-2 overflow-hidden">
        <UnUiButton
          icon="i-heroicons-pencil-square"
          size="sm"
          square
          variant="outline" />
        <UnUiButton
          icon="i-ph-bell-simple-slash"
          size="sm"
          square
          variant="outline" />
        <UnUiButton
          icon="i-ph-alarm"
          size="sm"
          square
          variant="outline" />
        <UnUiButton
          icon="i-ph-trash"
          size="sm"
          square
          variant="outline" />
      </div>
    </div>
    <div
      class="flex h-full max-h-full w-full max-w-full flex-row gap-2 overflow-hidden">
      <div
        class="flex h-full max-h-full w-[600px] min-w-[600px] flex-col gap-2">
        <div class="flex h-full max-h-full grow flex-col gap-0 overflow-hidden">
          <div
            class="z-20000 mb-[-12px] h-[12px] bg-gradient-to-b from-gray-100" />
          <ConvosConvoMessages
            :convo-public-id="convoPublicId"
            :participant-public-id="convoDetails?.participantPublicId || ''" />
          <div class="mt-[-12px] h-[12px] bg-gradient-to-t from-gray-100" />
        </div>
        <div class="flex w-full flex-col justify-items-end gap-2">
          replyingToBanner
          <UnEditor v-model:modelValue="editorData" />
          <div class="flex min-w-fit flex-row justify-end gap-2">
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
      <div
        class="border-l-1 flex h-full w-full max-w-full flex-col justify-between gap-8 overflow-hidden border border-b-0 border-r-0 border-t-0 border-gray-200 px-4 py-0 dark:border-gray-800">
        <div class="flex w-full max-w-full flex-col gap-8 overflow-hidden">
          <div class="flex w-full max-w-full flex-col gap-4 overflow-hidden">
            <div
              class="flex w-full max-w-full flex-row items-center justify-between overflow-hidden"
              @click="convoParticiapntsCollapsed = !convoParticiapntsCollapsed">
              <span
                class="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
                PARTICIPANTS
              </span>
              <UnUiButton
                :icon="
                  convoParticiapntsCollapsed
                    ? 'i-heroicons-chevron-down'
                    : 'i-heroicons-chevron-up'
                "
                size="2xs"
                square
                variant="ghost" />
            </div>
            <div
              v-if="convoParticiapntsCollapsed"
              class="flex w-full max-w-full flex-row gap-2 overflow-hidden"
              @click="convoParticiapntsCollapsed = !convoParticiapntsCollapsed">
              <NuxtUiAvatarGroup>
                <template
                  v-for="participant of participantsAssignedArray"
                  :key="participant.participantPublicId">
                  <ConvosConvoAvatar
                    :participant="participant"
                    size="sm" />
                </template>
                <template
                  v-for="participant of participantContributorsArray"
                  :key="participant.participantPublicId">
                  <ConvosConvoAvatar
                    :participant="participant"
                    size="sm" />
                </template>
                <template
                  v-for="participant of participantCommentersArray"
                  :key="participant.participantPublicId">
                  <ConvosConvoAvatar
                    :participant="participant"
                    size="sm" />
                </template>
                <template
                  v-for="participant of participantGuestsArray"
                  :key="participant.participantPublicId">
                  <ConvosConvoAvatar
                    :participant="participant"
                    size="sm" />
                </template>
              </NuxtUiAvatarGroup>
            </div>
            <div
              v-if="!convoParticiapntsCollapsed"
              class="flex h-fit w-full max-w-full flex-col gap-4 overflow-hidden"
              @click="convoParticiapntsCollapsed = !convoParticiapntsCollapsed">
              <div
                v-if="participantsAssignedArray.length"
                class="flex w-full max-w-full flex-col gap-2 overflow-hidden">
                <span class="text-xs text-gray-600 dark:text-gray-400">
                  ASSIGNED
                </span>
                <div
                  class="flex w-full max-w-full flex-col gap-2 overflow-hidden">
                  <template
                    v-for="participant of participantsAssignedArray"
                    :key="participant.participantPublicId">
                    <div
                      class="flex w-full max-w-full flex-row items-center gap-2 overflow-hidden">
                      <ConvosConvoAvatar
                        :participant="participant"
                        size="md" />
                      <span>{{ participant.name }}</span>
                    </div>
                  </template>
                </div>
              </div>
              <div
                v-if="participantContributorsArray.length"
                class="flex w-full max-w-full flex-col gap-2 overflow-hidden">
                <span
                  class="w-full max-w-full overflow-hidden text-xs text-gray-600 dark:text-gray-400">
                  CONTRIBUTORS
                </span>
                <div
                  class="flex w-full max-w-full flex-col gap-2 overflow-hidden">
                  <template
                    v-for="participant of participantContributorsArray"
                    :key="participant.participantPublicId">
                    <div class="flex flex-row items-center gap-2">
                      <ConvosConvoAvatar
                        :participant="participant"
                        size="md" />
                      <span class="truncate">{{ participant.name }}</span>
                    </div>
                  </template>
                </div>
              </div>
              <div
                v-if="participantCommentersArray.length"
                class="flex flex-col gap-2">
                <span class="text-xs text-gray-600 dark:text-gray-400">
                  COMMENTERS
                </span>
                <div class="flex flex-col gap-2">
                  <template
                    v-for="participant of participantCommentersArray"
                    :key="participant.participantPublicId">
                    <div class="flex flex-row items-center gap-2">
                      <ConvosConvoAvatar
                        :participant="participant"
                        size="md" />
                      <span>{{ participant.name }}</span>
                    </div>
                  </template>
                </div>
              </div>
              <div
                v-if="participantWatchersArray.length"
                class="flex flex-col gap-2">
                <span class="text-xs text-gray-600 dark:text-gray-400">
                  WATCHERS
                </span>
                <div class="flex flex-col gap-2">
                  <template
                    v-for="participant of participantWatchersArray"
                    :key="participant.participantPublicId">
                    <div class="flex flex-row items-center gap-2">
                      <ConvosConvoAvatar
                        :participant="participant"
                        size="md" />
                      <span>{{ participant.name }}</span>
                    </div>
                  </template>
                </div>
              </div>
              <div
                v-if="participantGuestsArray.length"
                class="flex flex-col gap-2">
                <span class="text-xs text-gray-600 dark:text-gray-400">
                  GUEST
                </span>
                <div class="flex flex-col gap-2">
                  <template
                    v-for="participant of participantGuestsArray"
                    :key="participant.participantPublicId">
                    <div class="flex flex-row items-center gap-2">
                      <ConvosConvoAvatar
                        :participant="participant"
                        size="md" />
                      <span>{{ participant.name }}</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <div class="flex w-full max-w-full flex-col gap-4 overflow-hidden">
            <div
              class="flex w-full max-w-full flex-row items-center justify-between overflow-hidden"
              @click="attachmentsCollapsed = !attachmentsCollapsed">
              <span
                class="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
                ATTACHMENTS
              </span>
              <UnUiButton
                :icon="
                  attachmentsCollapsed
                    ? 'i-heroicons-chevron-down'
                    : 'i-heroicons-chevron-up'
                "
                size="2xs"
                square
                variant="ghost" />
            </div>
            <div
              v-if="attachments.length && attachmentsCollapsed"
              class="flex max-w-full flex-row flex-wrap gap-2 overflow-hidden">
              <div
                v-for="attachment of attachments"
                :key="attachment.publicId">
                <div
                  class="border-1 border-base-5 bg-base-2 flex flex-row gap-1 rounded border px-2 py-1">
                  <UnUiIcon
                    name="i-ph-paperclip"
                    size="16" />
                  <span class="truncate text-xs"> {{ attachment.name }}</span>
                </div>
              </div>
            </div>
            <div
              v-if="attachments.length && !attachmentsCollapsed"
              class="flex max-w-full flex-row flex-wrap gap-2 overflow-hidden">
              <div
                v-for="attachment of attachments"
                :key="attachment.publicId">
                <div
                  class="border-1 border-base-5 bg-base-2 flex flex-row gap-1 rounded border px-2 py-1">
                  <UnUiIcon
                    name="i-ph-paperclip"
                    size="16" />
                  <span class="truncate text-xs"> {{ attachment.name }}</span>
                </div>
              </div>
            </div>
            <div
              v-if="!attachments.length"
              class="flex max-w-full flex-row flex-wrap gap-2 overflow-hidden">
              <span class="text-xs text-gray-500">No attachments</span>
            </div>
          </div>
        </div>

        <div class="flex min-w-fit flex-col justify-self-end">
          <UnUiTooltip :text="createDate?.toLocaleString()">
            <span class="text-base-11 text-xs">
              Started: {{ createdAgo }}
            </span>
          </UnUiTooltip>
          <UnUiTooltip :text="updateDate?.toLocaleString()">
            <span class="text-base-11 text-xs">
              Updated: {{ updatedAgo }}
            </span>
          </UnUiTooltip>
        </div>
      </div>
    </div>
  </div>
</template>
