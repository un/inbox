<script setup lang="ts">
  import {
    computed,
    navigateTo,
    provide,
    ref,
    useNuxtApp,
    useRoute,
    useToast,
    watch,
    useRuntimeConfig
  } from '#imports';
  import { useUtils } from '~/composables/utils';
  import { useTimeAgo } from '@vueuse/core';
  import type {
    ConvoParticipantEntry,
    ConvoAttachmentUpload
  } from '~/composables/types';
  import { tiptapVue3, emptyTiptapEditorContent } from '@u22n/tiptap';
  import { type ConvoEntryMetadata } from '@u22n/database/schema';
  import { stringify } from 'superjson';
  import { validateTypeId, type TypeId } from '@u22n/utils';
  import type { UnEditor } from '#components';

  const { $trpc } = useNuxtApp();

  type AttachmentEntry = {
    name: string;
    publicId: TypeId<'convoAttachments'>;
    type: string;
    url: string;
  };

  const attachments = ref<AttachmentEntry[]>([]);
  const convoParticipantsCollapsed = ref(true);
  const attachmentsCollapsed = ref(true);
  const participantOwnPublicId = ref('');
  const participantArray = ref<ConvoParticipantEntry[]>([]);
  const participantsAssignedArray = ref<ConvoParticipantEntry[]>([]);
  const participantContributorsArray = ref<ConvoParticipantEntry[]>([]);
  const participantCommentersArray = ref<ConvoParticipantEntry[]>([]);
  const participantWatchersArray = ref<ConvoParticipantEntry[]>([]);
  const participantGuestsArray = ref<ConvoParticipantEntry[]>([]);
  const participantsAll = computed(() =>
    participantsAssignedArray.value.concat(
      participantContributorsArray.value,
      participantCommentersArray.value,
      participantWatchersArray.value,
      participantGuestsArray.value
    )
  );
  const createDate = ref<Date | null>(null);
  const updateDate = ref<Date | null>(null);
  const createdAgo = ref('');
  const updatedAgo = ref('');

  const convoIsHidden = ref(false);

  const replyToMessagePublicId = ref('');
  const replyToMessageMetadata = ref<ConvoEntryMetadata | undefined>(undefined);

  const orgShortcode = useRoute().params.orgShortcode as string;
  const route = useRoute();

  const convoPublicId = useRoute().params.convoId as TypeId<'convos'>;
  if (!validateTypeId('convos', convoPublicId)) {
    await navigateTo(`/${orgShortcode}/convo/404`);
  }

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
        navigateTo(`/${orgShortcode}/convo/404`);
      }
      if (!convoDetails.value?.data?.participants) {
        navigateTo(`/${orgShortcode}/convo/404`);
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
    participantArray.value = [];
    participantsAssignedArray.value = [];
    participantContributorsArray.value = [];
    participantCommentersArray.value = [];
    participantWatchersArray.value = [];
    participantGuestsArray.value = [];

    for (const participant of convoParticipants) {
      if (participant.publicId === convoDetails.value?.ownParticipantPublicId) {
        convoIsHidden.value = participant.hidden;
      }
      const participantData = useUtils().convos.useParticipantData(participant);
      if (!participantData) continue;

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
      attachments.value = [];
      for (const attachment of convoDetails.value.data.attachments.filter(
        (_) => !_.inline
      )) {
        const attachmentUrl = `${useRuntimeConfig().public.storageUrl}/attachment/${orgShortcode}/${attachment.publicId}/${attachment.fileName}`;
        const splitFileName = attachment.fileName.split('.');
        const newFileName =
          (splitFileName[0]?.substring(0, 10) ?? '') +
          '...' +
          splitFileName[splitFileName.length - 1];
        attachments.value.push({
          name: newFileName,
          publicId: attachment.publicId,
          type: attachment.type,
          url: attachmentUrl
        });
      }
    }
    participantOwnPublicId.value =
      convoDetails.value?.ownParticipantPublicId || '';
  });
  provide('convoParticipants', participantArray);
  provide('participantPublicId', participantOwnPublicId);

  //*
  //*
  //* new reply fields
  //*
  const convoHasContactParticipants = computed(() => {
    return participantArray.value.some(
      (participant) => participant.type === 'contact'
    );
  });
  const attachmentUploads = ref<ConvoAttachmentUpload[]>([]);
  const currentTotalUploadSize = computed(() => {
    return attachmentUploads.value.reduce((acc, attachment) => {
      return acc + attachment.size;
    }, 0);
  });
  interface OrgEmailIdentities {
    publicId: string;
    address: string;
    sendName: string | null;
  }
  const orgEmailIdentities = ref<OrgEmailIdentities[]>([]);
  const selectedOrgEmailIdentities = ref<OrgEmailIdentities | undefined>(
    undefined
  );
  const messageEditorData = ref<tiptapVue3.JSONContent>(
    emptyTiptapEditorContent
  );
  const editor = ref<null | InstanceType<typeof UnEditor>>(null);
  const actionLoading = ref(false);
  const isTextPresent = computed(() => {
    const contentArray = messageEditorData.value?.content;
    if (!contentArray) return false;
    if (contentArray.length === 0) return false;
    if (
      contentArray[0] &&
      (!contentArray[0].content || contentArray[0].content.length === 0)
    )
      return false;
    return true;
  });

  const formValid = computed(() => {
    return convoHasContactParticipants.value
      ? selectedOrgEmailIdentities.value && isTextPresent.value
      : isTextPresent.value;
  });

  // Get email identities

  const { data: userEmailIdentitiesData } =
    await $trpc.org.mail.emailIdentities.getUserEmailIdentities.useLazyQuery(
      {},
      {
        server: false
      }
    );
  watch(userEmailIdentitiesData, (newUserEmailIdentitiesData) => {
    orgEmailIdentities.value = [];
    selectedOrgEmailIdentities.value = undefined;
    if (newUserEmailIdentitiesData?.emailIdentities) {
      for (const orgObject of newUserEmailIdentitiesData.emailIdentities) {
        orgEmailIdentities.value.push({
          publicId: orgObject.publicId,
          address: orgObject.username + '@' + orgObject.domainName,
          sendName: orgObject.sendName
        });
      }
    }
    if (participantOwnPublicId.value) {
      const ownConvoParticipantObject =
        convoDetails.value?.data?.participants.find(
          (participant) => participant.publicId === participantOwnPublicId.value
        );
      const ownConvoEmailIdentityObject =
        userEmailIdentitiesData?.value?.emailIdentities.find(
          (emailIdentity) =>
            emailIdentity.publicId ===
            ownConvoParticipantObject?.emailIdentity?.publicId
        );
      selectedOrgEmailIdentities.value = {
        publicId: ownConvoEmailIdentityObject?.publicId || '',
        address:
          ownConvoEmailIdentityObject?.username +
            '@' +
            ownConvoEmailIdentityObject?.domainName || '',
        sendName: ownConvoEmailIdentityObject?.sendName || ''
      };
    }
  });

  watch(replyToMessagePublicId, (newReplyToMessagePublicId) => {
    if (newReplyToMessagePublicId) {
      if (replyToMessageMetadata.value)
        findAndSetReplyFromEmailIdentity(replyToMessageMetadata.value);
    }
  });

  const findAndSetReplyFromEmailIdentity = (
    messageMetadata: ConvoEntryMetadata
  ) => {
    const emailMetadata = messageMetadata.email;
    if (!emailMetadata) return;
    // gett all the publicIds of entries in emailMetadata.to array where the type is 'emailIdentity'
    const findAndSetEmailIdentity = (
      emailMetadataField: 'to' | 'from' | 'cc'
    ) => {
      const addressPublicIds = emailMetadata[emailMetadataField]
        .filter((address) => address.type === 'emailIdentity')
        .map((address) => address.publicId);
      // find the first publicId in the addressPublicIds array that is in orgEmailIdentities
      const foundPublicId = addressPublicIds.find((publicId) =>
        orgEmailIdentities.value.some(
          (emailIdentity) => emailIdentity.publicId === publicId
        )
      );
      if (foundPublicId) {
        const emailIdentityMetaEntry = orgEmailIdentities.value.find(
          (emailIdentity) => emailIdentity.publicId === foundPublicId
        );
        selectedOrgEmailIdentities.value =
          {
            publicId: foundPublicId,
            address: emailIdentityMetaEntry?.address || '',
            sendName: emailIdentityMetaEntry?.sendName || ''
          } || {};
        return;
      }
    };

    // Call the function for 'to', 'from', and 'cc'
    findAndSetEmailIdentity('to');
    findAndSetEmailIdentity('from');
    findAndSetEmailIdentity('cc');
  };

  const toast = useToast();
  async function createNewReply(type: 'draft' | 'comment' | 'message') {
    actionLoading.value = true;

    if (
      convoHasContactParticipants.value &&
      !selectedOrgEmailIdentities.value
    ) {
      actionLoading.value = false;
      toast.add({
        id: 'create_convo_reply_fail',
        title: 'Cant reply to this conversation',
        description: `Please set your "send as" address.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }

    const createConvoReplyTrpc = $trpc.convos.replyToConvo.useMutation();
    await createConvoReplyTrpc.mutate({
      ...(convoHasContactParticipants.value
        ? {
            sendAsEmailIdentityPublicId:
              selectedOrgEmailIdentities.value?.publicId
          }
        : {}),
      replyToMessagePublicId: replyToMessagePublicId.value,
      messageType: type,
      message: stringify(messageEditorData.value),
      attachments: attachmentUploads.value
    });

    if (createConvoReplyTrpc.status.value === 'error') {
      actionLoading.value = false;
      toast.add({
        id: 'create_convo_reply_fail',
        title: "couldn't reply to this conversation",
        description: `Something went wrong when replying to this conversation.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }
    actionLoading.value = false;
    attachmentUploads.value = [];
    editor.value?.resetEditor();
    messageEditorData.value = emptyTiptapEditorContent;
    convoIsHidden.value = false;
  }

  const isContextOpen = ref(false);

  watch(
    () => route.path,
    () => {
      isContextOpen.value = true;
    }
  );

  async function hideConvo() {
    const hideConvoTrpc = $trpc.convos.hideConvo.useMutation();
    await hideConvoTrpc.mutate({
      convoPublicId: convoPublicId,
      unhide: convoIsHidden.value
    });
    convoIsHidden.value = !convoIsHidden.value;
    toast.remove('hide_convo');
    toast.add({
      id: 'hide_convo',
      title: convoIsHidden.value
        ? 'Conversation hidden'
        : 'Conversation unhidden',
      icon: convoIsHidden.value ? 'i-ph-eye-slash' : 'i-ph-eye',
      color: 'green',

      timeout: 10000,
      actions: [
        {
          label: 'Undo',
          click: () => {
            hideConvo();
          }
        }
      ]
    });
  }
</script>
<template>
  <div
    class="flex h-full max-h-full w-full max-w-full flex-col overflow-hidden">
    <div
      class="border-base-7 flex w-full max-w-full flex-row items-center justify-between border-b p-4">
      <div class="flex flex-row items-center gap-2">
        <div>
          <UnUiButton
            icon="i-ph-arrow-left"
            square
            variant="soft"
            @click="navigateTo(`/${orgShortcode}/convo`)" />
        </div>
        <template
          v-for="subject of convoDetails?.data?.subjects"
          :key="subject.publicId">
          <span
            class="bg-base-2 text-md break-word max-w-full overflow-clip rounded-xl px-3 py-2">
            {{ subject.subject }}
          </span>
        </template>

        <!-- <span>TAGS</span> -->
      </div>

      <div class="h-fit flex-row gap-4 overflow-hidden">
        <UnUiTooltip
          :text="convoIsHidden ? 'Show conversation' : 'Hide conversation'">
          <UnUiButton
            :icon="convoIsHidden ? 'i-ph-eye' : 'i-ph-eye-slash'"
            :color="convoIsHidden ? 'green' : 'base'"
            size="sm"
            square
            variant="soft"
            @click="hideConvo()" />
        </UnUiTooltip>
      </div>
    </div>

    <div
      class="flex h-full max-h-full w-full max-w-full flex-col-reverse overflow-hidden lg:grid lg:grid-cols-3">
      <!-- Messages Pane -->
      <div
        class="col-span-2 flex h-full max-h-full flex-col overflow-hidden px-0">
        <div class="flex h-full max-h-full grow flex-col gap-0 overflow-hidden">
          <ConvosConvoMessages
            v-model:reply-to-message-public-id="replyToMessagePublicId"
            v-model:reply-to-message-metadata="replyToMessageMetadata"
            :convo-public-id="convoPublicId"
            :participant-public-id="participantOwnPublicId || ''" />
        </div>
        <div
          class="border-base-7 flex w-full flex-col justify-items-end gap-2 border-t p-4 pt-2">
          <div class="flex flex-row items-center gap-2">
            <span class="text-base-11 text-xs font-medium"> REPLY </span>
            <NuxtUiSelectMenu
              v-if="
                convoHasContactParticipants &&
                selectedOrgEmailIdentities &&
                selectedOrgEmailIdentities.publicId
              "
              v-model="selectedOrgEmailIdentities"
              searchable
              :disabled="orgEmailIdentities.length === 0"
              :placeholder="'Select email identity'"
              :options="orgEmailIdentities"
              variant="none"
              size="xs"
              :ui="{
                wrapper: 'w-fit',
                ring: 'ring-0 ring-base-11 dark:ring-base-11',
                color: {}
              }">
              <template #label>
                <div
                  v-if="
                    selectedOrgEmailIdentities &&
                    selectedOrgEmailIdentities.publicId
                  "
                  class="flex flex-wrap gap-3">
                  <span class="text-base-9 dark:text-base-9">
                    via {{ selectedOrgEmailIdentities.sendName }}
                    <span> - {{ selectedOrgEmailIdentities.address }} </span>
                  </span>
                </div>
                <span v-else>Select email identity</span>
              </template>
              <template #option="{ option }">
                <span>
                  {{ option.sendName }}
                  <span class="text-base-11"> - {{ option.address }} </span>
                </span>
              </template>
              <template #option-empty=""> No email identities found </template>
            </NuxtUiSelectMenu>
          </div>
          <UnEditor
            ref="editor"
            v-model:modelValue="messageEditorData" />
          <div
            v-if="attachmentUploads.length > 0"
            class="flex h-fit w-full max-w-full flex-row justify-between gap-2">
            <div class="flex w-full grow flex-row flex-wrap gap-2">
              <div
                v-for="attachment in attachmentUploads"
                :key="attachment.attachmentPublicId">
                <UnUiTooltip text="click to remove">
                  <UnUiButton
                    variant="soft"
                    color="amber"
                    size="xs"
                    :label="attachment.fileName"
                    icon="i-ph-paperclip"
                    @click="
                      attachmentUploads = attachmentUploads.filter(
                        (item) =>
                          item.attachmentPublicId !==
                          attachment.attachmentPublicId
                      )
                    " />
                </UnUiTooltip>
              </div>
            </div>
            <div class="w-fit">
              <ConvosUpload
                v-model:uploadedAttachments="attachmentUploads"
                :max-size="20000000"
                :current-size="currentTotalUploadSize"
                :org-shortcode="orgShortcode">
                <template #default="{ openFileDialog, loading }">
                  <UnUiButton
                    square
                    size="xs"
                    variant="outline"
                    :loading="loading"
                    icon="i-ph-plus"
                    @click="openFileDialog" />
                </template>
              </ConvosUpload>
            </div>
          </div>
          <div class="flex min-w-fit flex-row items-center justify-end gap-2">
            <ConvosUpload
              v-if="attachmentUploads.length === 0"
              v-model:uploadedAttachments="attachmentUploads"
              :max-size="15000000"
              :current-size="currentTotalUploadSize"
              :org-shortcode="orgShortcode">
              <template #default="{ openFileDialog, loading }">
                <UnUiButton
                  :loading="loading"
                  label="Upload"
                  icon="i-ph-upload"
                  variant="outline"
                  @click="openFileDialog" />
              </template>
            </ConvosUpload>
            <UnUiButton
              label="Comment"
              icon="i-ph-note"
              variant="outline"
              :disabled="!formValid || actionLoading"
              @click="createNewReply('comment')" />
            <UnUiButton
              label="Send"
              icon="i-ph-envelope"
              variant="outline"
              :loading="actionLoading"
              :disabled="!formValid || actionLoading"
              @click="createNewReply('message')" />
          </div>
        </div>
      </div>
      <div class="visible px-4 pt-2 lg:hidden">
        <UnUiButton
          label="Show Convo Info"
          icon="i-ph-info"
          variant="outline"
          size="xs"
          block
          @click="isContextOpen = !isContextOpen" />
      </div>
      <!-- Context Pane -->
      <div
        class="border-l-1 border-b-1 border-base-6 hidden h-fit w-full max-w-full flex-col justify-between gap-4 overflow-hidden border border-r-0 border-t-0 p-4 lg:visible lg:flex lg:h-full lg:gap-8 lg:border-b-0">
        <div
          class="flex w-full max-w-full flex-col gap-4 overflow-hidden lg:gap-8">
          <div class="flex w-full max-w-full flex-col gap-4 overflow-hidden">
            <div
              class="flex w-full max-w-full flex-row items-center justify-between overflow-hidden"
              @click="convoParticipantsCollapsed = !convoParticipantsCollapsed">
              <span class="text-base-11 cursor-pointer text-sm font-medium">
                PARTICIPANTS
              </span>
              <UnUiButton
                :icon="
                  convoParticipantsCollapsed
                    ? 'i-heroicons-chevron-down'
                    : 'i-heroicons-chevron-up'
                "
                size="2xs"
                square
                variant="ghost" />
            </div>
            <div
              v-if="convoParticipantsCollapsed"
              class="flex w-full max-w-full flex-row gap-2 overflow-hidden"
              @click="convoParticipantsCollapsed = !convoParticipantsCollapsed">
              <NuxtUiAvatarGroup>
                <template
                  v-for="participant of participantsAll"
                  :key="participant.participantPublicId">
                  <ConvosConvoAvatar
                    :participant="participant"
                    size="sm"
                    :ring="true" />
                </template>
              </NuxtUiAvatarGroup>
            </div>
            <div
              v-if="!convoParticipantsCollapsed"
              class="flex h-fit w-full max-w-full flex-col gap-4 overflow-hidden">
              <div
                v-if="participantsAssignedArray.length"
                class="flex w-full max-w-full flex-col gap-2 overflow-hidden">
                <span class="text-base-11 text-xs"> ASSIGNED </span>
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
                  class="text-base-11 w-full max-w-full overflow-hidden text-xs">
                  CONTRIBUTORS
                </span>
                <div
                  class="flex w-full max-w-full flex-col gap-2 overflow-hidden">
                  <template
                    v-for="participant of participantContributorsArray"
                    :key="participant.participantPublicId">
                    <NuxtUiPopover
                      v-if="participant.signaturePlainText"
                      mode="hover">
                      <div class="flex flex-row items-center gap-2">
                        <ConvosConvoAvatar
                          :participant="participant"
                          size="md" />
                        <span class="truncate">{{ participant.name }}</span>
                      </div>
                      <template #panel>
                        <div class="flex flex-col gap-2 p-4">
                          <span class="text-base-11 text-sm"> SIGNATURE </span>
                          <!-- <span class="text-base-11 text-xs"> PLAIN </span>
                          <span class="whitespace-pre text-xs">
                            {{
                              participant.signaturePlainText.replace(
                                /\\n/g,
                                '\n'
                              )
                            }}
                          </span> -->
                          <!-- <span class="text-base-11 text-xs"> HTML </span> -->

                          <!-- eslint-disable-next-line vue/no-v-html -->
                          <div v-html="participant.signatureHtml" />
                        </div>
                      </template>
                    </NuxtUiPopover>
                    <div
                      v-else
                      class="flex flex-row items-center gap-2">
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
                <span class="text-base-11 text-xs"> COMMENTERS </span>
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
                <span class="text-base-11 text-xs"> WATCHERS </span>
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
                <span class="text-base-11 text-xs"> GUEST </span>
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
              <span class="text-base-11 cursor-pointer text-sm font-medium">
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
                <UnUiButton
                  :label="attachment.name"
                  variant="outline"
                  size="xs"
                  :icon="
                    attachment.type === 'image'
                      ? 'i-ph-image'
                      : 'i-ph-paperclip'
                  "
                  @click="
                    navigateTo(attachment.url, {
                      external: true,
                      open: {
                        target: '_blank'
                      }
                    })
                  " />
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
              <span class="text-base-11 text-xs">No attachments</span>
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

      <!-- Mobile context -->
      <NuxtUiSlideover v-model="isContextOpen">
        <div class="flex w-full max-w-full flex-col gap-4 overflow-hidden p-4">
          <div class="flex w-full max-w-full flex-col gap-4 overflow-hidden">
            <UnUiButton
              label="close"
              icon="i-ph-x"
              variant="outline"
              size="xs"
              block
              @click="isContextOpen = false" />
            <div
              class="flex w-full max-w-full flex-row items-center justify-between overflow-hidden"
              @click="convoParticipantsCollapsed = !convoParticipantsCollapsed">
              <span class="text-base-11 cursor-pointer text-sm font-medium">
                PARTICIPANTS
              </span>
              <UnUiButton
                :icon="
                  convoParticipantsCollapsed
                    ? 'i-heroicons-chevron-down'
                    : 'i-heroicons-chevron-up'
                "
                size="2xs"
                square
                variant="ghost" />
            </div>
            <div
              v-if="convoParticipantsCollapsed"
              class="flex w-full max-w-full flex-row gap-2 overflow-hidden"
              @click="convoParticipantsCollapsed = !convoParticipantsCollapsed">
              <NuxtUiAvatarGroup>
                <template
                  v-for="participant of participantsAll"
                  :key="participant.participantPublicId">
                  <ConvosConvoAvatar
                    :participant="participant"
                    size="sm"
                    :ring="true" />
                </template>
              </NuxtUiAvatarGroup>
            </div>
            <div
              v-if="!convoParticipantsCollapsed"
              class="flex h-fit w-full max-w-full flex-col gap-4 overflow-hidden">
              <div
                v-if="participantsAssignedArray.length"
                class="flex w-full max-w-full flex-col gap-2 overflow-hidden">
                <span class="text-base-11 text-xs"> ASSIGNED </span>
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
                  class="text-base-11 w-full max-w-full overflow-hidden text-xs">
                  CONTRIBUTORS
                </span>
                <div
                  class="flex w-full max-w-full flex-col gap-2 overflow-hidden">
                  <template
                    v-for="participant of participantContributorsArray"
                    :key="participant.participantPublicId">
                    <NuxtUiPopover
                      v-if="participant.signaturePlainText"
                      mode="hover">
                      <div class="flex flex-row items-center gap-2">
                        <ConvosConvoAvatar
                          :participant="participant"
                          size="md" />
                        <span class="truncate">{{ participant.name }}</span>
                      </div>
                      <template #panel>
                        <div class="flex flex-col gap-2 p-4">
                          <span class="text-base-11 text-sm"> SIGNATURE </span>
                          <!-- <span class="text-base-11 text-xs"> PLAIN </span>
                          <span class="whitespace-pre text-xs">
                            {{
                              participant.signaturePlainText.replace(
                                /\\n/g,
                                '\n'
                              )
                            }}
                          </span> -->
                          <!-- <span class="text-base-11 text-xs"> HTML </span> -->

                          <!-- eslint-disable-next-line vue/no-v-html -->
                          <div v-html="participant.signatureHtml" />
                        </div>
                      </template>
                    </NuxtUiPopover>
                    <div
                      v-else
                      class="flex flex-row items-center gap-2">
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
                <span class="text-base-11 text-xs"> COMMENTERS </span>
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
                <span class="text-base-11 text-xs"> WATCHERS </span>
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
                <span class="text-base-11 text-xs"> GUEST </span>
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
              <span class="text-base-11 cursor-pointer text-sm font-medium">
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
                <UnUiButton
                  :label="attachment.name"
                  variant="outline"
                  size="xs"
                  :icon="
                    attachment.type === 'image'
                      ? 'i-ph-image'
                      : 'i-ph-paperclip'
                  "
                  @click="
                    navigateTo(attachment.url, {
                      external: true,
                      open: {
                        target: '_blank'
                      }
                    })
                  " />
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
              <span class="text-base-11 text-xs">No attachments</span>
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
      </NuxtUiSlideover>
    </div>
  </div>
</template>
