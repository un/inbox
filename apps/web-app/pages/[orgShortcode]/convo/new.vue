<script setup lang="ts">
  import {
    computed,
    navigateTo,
    ref,
    useNuxtApp,
    useRoute,
    useToast,
    watch
  } from '#imports';
  import { type ConvoAttachmentUpload } from '~/composables/types';
  import type { tiptapVue3 } from '@u22n/tiptap';
  import { emptyTiptapEditorContent } from '@u22n/tiptap';
  import type { UiColor } from '@u22n/types/ui';
  import { stringify } from 'superjson';
  import { z } from 'zod';
  import type { TypeId } from '@u22n/utils';

  const { $trpc } = useNuxtApp();
  const orgShortcode = useRoute().params.orgShortcode as string;
  const attachmentUploads = ref<ConvoAttachmentUpload[]>([]);
  const currentTotalUploadSize = computed(() => {
    return attachmentUploads.value.reduce((acc, attachment) => {
      return acc + attachment.size;
    }, 0);
  });

  type JSONContent = tiptapVue3.JSONContent;

  // TODO: handle if the domain is not valid/enabled. display the email address in the list but show it as disabled and show a tooltip on hover that says "this domain is not enabled for sending"
  interface OrgEmailIdentities {
    publicId: TypeId<'emailIdentities'>;
    address: string;
    sendName: string | null;
    disabled?: boolean;
  }

  interface ConvoParticipantOrgMembers {
    type: 'orgMember';
    icon: 'i-ph-user';
    publicId: TypeId<'orgMembers'>;
    avatarTimestamp: Date | null;
    profilePublicId: TypeId<'orgMemberProfile'>;
    name: String;
    handle: String;
    title: String | null;
    disabled?: Boolean;
    keywords: String;
    own?: Boolean;
  }
  interface ConvoParticipantOrgGroups {
    type: 'group';
    icon: 'i-ph-users-three';
    publicId: TypeId<'groups'>;
    avatarTimestamp: Date | null;
    name: String;
    description: String | null;
    color: String | null;
    keywords: String;
  }
  interface ConvoParticipantOrgContacts {
    type: 'contact';
    icon: 'i-ph-address-book';
    publicId: TypeId<'contacts'>;
    avatarTimestamp: Date | null;
    name: String;
    address: String;
    keywords: String;
    screenerStatus: 'pending' | 'approve' | 'reject' | null;
  }
  interface NewConvoParticipantEmailAddresses {
    type: 'email';
    icon: 'i-ph-envelope';
    publicId: Number;
    address: String;
    keywords: String;
  }

  type NewConvoParticipant =
    | ConvoParticipantOrgMembers
    | ConvoParticipantOrgGroups
    | ConvoParticipantOrgContacts
    | NewConvoParticipantEmailAddresses;

  //* Data Loading
  // Get email identities
  const { data: userEmailIdentitiesData, status: userEmailIdentitiesStatus } =
    await $trpc.org.mail.emailIdentities.getUserEmailIdentities.useLazyQuery(
      {},
      {
        server: false
      }
    );

  // get list of users
  const { data: orgMembersData, status: orgMembersStatus } =
    await $trpc.org.users.members.getOrgMembersList.useLazyQuery(
      {},
      {
        server: false
      }
    );

  // get list of groups
  const { data: orgGroupsData, status: orgGroupsStatus } =
    await $trpc.org.users.groups.getOrgGroups.useLazyQuery(
      {},
      {
        server: false
      }
    );

  // get list of org contacts
  const { data: orgContactsData } =
    await $trpc.org.contacts.getOrgContacts.useLazyQuery(
      {},
      {
        server: false
      }
    );

  //* List Data
  const orgEmailIdentities = ref<OrgEmailIdentities[]>([]);
  const orgMembers = ref<ConvoParticipantOrgMembers[]>([]);
  const orgGroups = ref<ConvoParticipantOrgGroups[]>([]);
  const orgContacts = ref<ConvoParticipantOrgContacts[]>([]);

  //* Data Watchers
  function setParticipantOptions() {
    participantOptions.value = [
      ...orgMembers.value,
      ...orgGroups.value,
      ...orgContacts.value
    ];
  }

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
    if (newUserEmailIdentitiesData?.defaultEmailIdentity) {
      const defaultEmailIdentityObject =
        newUserEmailIdentitiesData?.emailIdentities.find(
          (emailIdentity) =>
            emailIdentity.publicId ===
            newUserEmailIdentitiesData.defaultEmailIdentity
        );
      selectedOrgEmailIdentities.value = {
        publicId: defaultEmailIdentityObject?.publicId!,
        address:
          defaultEmailIdentityObject?.username +
            '@' +
            defaultEmailIdentityObject?.domainName || '',
        sendName: defaultEmailIdentityObject?.sendName || ''
      };
    }
  });

  watch(orgMembersData, (newOrgMembersData) => {
    if (newOrgMembersData?.ownMembershipId) {
      const ownOrgMemberData = newOrgMembersData.members?.find(
        (member) => member.publicId === newOrgMembersData.ownMembershipId
      );
      if (!ownOrgMemberData) {
        throw new Error('own org member data not found');
      }
      const ownData: ConvoParticipantOrgMembers = {
        type: 'orgMember',
        icon: 'i-ph-user',
        publicId: ownOrgMemberData.publicId,
        profilePublicId: ownOrgMemberData.profile.publicId,
        avatarTimestamp: ownOrgMemberData.profile.avatarTimestamp,
        name:
          ownOrgMemberData.profile?.firstName +
            ' ' +
            ownOrgMemberData.profile?.lastName || '',
        handle: ownOrgMemberData.profile?.handle || '',
        title: ownOrgMemberData.profile?.title || '',
        keywords:
          ownOrgMemberData.profile?.firstName +
          ' ' +
          ownOrgMemberData.profile?.lastName +
          '  @' +
          ownOrgMemberData.profile?.handle +
          ' ' +
          ownOrgMemberData.profile?.title,
        disabled: true,
        own: true
      };
      orgMembers.value.push(ownData);
      // selectedOrgMembers.value = [ownData];
    }
    if (newOrgMembersData?.members) {
      for (const member of newOrgMembersData.members) {
        if (member.publicId === newOrgMembersData.ownMembershipId) {
          continue;
        }
        orgMembers.value.push({
          type: 'orgMember',
          icon: 'i-ph-user',
          publicId: member.publicId,
          profilePublicId: member.profile.publicId,
          avatarTimestamp: member.profile.avatarTimestamp,
          name:
            member.profile?.firstName + ' ' + member.profile?.lastName || '',
          handle: member.profile?.handle || '',
          title: member.profile?.title || '',
          keywords:
            member.profile?.firstName +
            ' ' +
            member.profile?.lastName +
            '  @' +
            member.profile?.handle +
            ' ' +
            member.profile?.title
        });
      }
    }
    setParticipantOptions();
  });

  watch(orgGroupsData, (newOrgGroupsData) => {
    if (newOrgGroupsData?.groups) {
      for (const group of newOrgGroupsData.groups) {
        orgGroups.value.push({
          type: 'group',
          icon: 'i-ph-users-three',
          publicId: group.publicId,
          avatarTimestamp: group.avatarTimestamp,
          name: group.name,
          description: group.description,
          color: group.color,
          keywords: group.name + ' ' + group.description
        });
      }
      setParticipantOptions();
    }
  });

  watch(orgContactsData, (newOrgContactsData) => {
    if (newOrgContactsData?.contacts) {
      for (const contact of newOrgContactsData.contacts) {
        orgContacts.value.push({
          type: 'contact',
          icon: 'i-ph-address-book',
          publicId: contact.publicId,
          avatarTimestamp: contact.avatarTimestamp,
          name:
            contact.setName ||
            contact.name ||
            contact.emailUsername + '@' + contact.emailDomain,
          address: contact.emailUsername + '@' + contact.emailDomain,
          keywords:
            contact.setName +
            ' ' +
            contact.name +
            ' ' +
            contact.emailUsername +
            '@' +
            contact.emailDomain,
          screenerStatus: contact.screenerStatus
        });
      }
      setParticipantOptions();
    }
  });
  // Values
  const participantOptions = ref<NewConvoParticipant[]>([]);
  const selectedParticipants = ref<NewConvoParticipant[]>([]);

  const orgEmailIdentitiesPlaceholder = computed(() => {
    if (userEmailIdentitiesStatus.value !== 'success') {
      return 'Loading Email Identities';
    }
    if (orgEmailIdentities.value.length === 0) {
      return 'No email identities found';
    }
    return 'Select Email Identity';
  });
  const selectedOrgEmailIdentities = ref<OrgEmailIdentities | undefined>(
    undefined
  );

  const hasEmailParticipants = computed(() => {
    return selectedParticipants.value.some(
      (participant) =>
        participant.type === 'email' || participant.type === 'contact'
    );
  });

  const hasEmailParticipantsNoEmailIdentitySelected = computed(() => {
    return (
      selectedParticipants.value.some(
        (participant) =>
          participant.type === 'email' || participant.type === 'contact'
      ) && selectedOrgEmailIdentities.value === undefined
    );
  });

  const emailButNoIdentityRingColor = computed(() => {
    return hasEmailParticipantsNoEmailIdentitySelected.value
      ? 'ring-red-9'
      : 'ring-base-9';
  });

  const participantLabels = computed({
    get: () => selectedParticipants.value,
    set: async (labels) => {
      const promises = labels.map(async (label) => {
        if (label.publicId) {
          return label;
        }
        const keywords = (label as { keywords: string }).keywords;
        const isEmail = z.string().email().safeParse(keywords);
        if (!isEmail.success) {
          return;
        }
        const newEntry: NewConvoParticipantEmailAddresses = {
          type: 'email',
          icon: 'i-ph-envelope',
          publicId: participantOptions.value.length + 1,
          //@ts-ignore
          address: keywords,
          keywords: keywords
        };

        participantOptions.value.push(newEntry);
        const inputElement = document.querySelector('input[name="q"]');
        if (inputElement) {
          // @ts-ignore
          inputElement.value = '';
        }
        return newEntry;
      });
      // @ts-ignore - no idea how to fix this
      selectedParticipants.value = await Promise.all(promises);
    }
  });

  const participantPlaceholder = computed(() => {
    if (
      orgGroupsStatus.value !== 'success' ||
      orgMembersStatus.value !== 'success'
    ) {
      return 'Loading Participants';
    }
    if (orgEmailIdentities.value.length === 0) {
      return 'Search (Select "Send As" to enable email participants)';
    }
    return 'Search or type email...';
  });

  const formValid = computed(() => {
    return (
      !hasEmailParticipantsNoEmailIdentitySelected.value &&
      selectedParticipants.value.length > 0 &&
      conversationTopicInput.value.length > 0 &&
      isTextPresent.value
    );
  });

  const messageEditorData = ref<JSONContent>(emptyTiptapEditorContent);

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
  // Topic/subject+

  const conversationTopicInput = ref('');
  const conversationSubjectInputValid = ref(false);

  const actionLoading = ref(false);

  async function createNewConvo(type: 'draft' | 'comment' | 'message') {
    const toast = useToast();
    actionLoading.value = true;
    if (!selectedParticipants.value[0]) {
      actionLoading.value = false;
      toast.add({
        id: 'create_new_convo_fail',
        title: 'Conversation creation failed',
        description: `Please select at least one participant.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }
    const getPublicIdsByType = (
      type: string,
      property: string = 'publicId'
    ) => {
      return selectedParticipants.value
        .filter((participant) => participant.type === type)
        .map((participant: NewConvoParticipant) =>
          participant[property as keyof NewConvoParticipant].toString()
        );
    };

    const convoParticipantsOrgMembersPublicIds =
      getPublicIdsByType('orgMember');
    const convoParticipantsGroupPublicIds = getPublicIdsByType('group');
    const convoParticipantsContactPublicIds = getPublicIdsByType('contact');
    const convoParticipantsEmailPublicIds = getPublicIdsByType(
      'email',
      'address'
    );
    const firstParticipant = selectedParticipants.value[0];
    const firstParticipantPublicId = firstParticipant.publicId?.toString();

    const convoToValue:
      | { type: 'email'; emailAddress: string }
      | { type: 'orgMember' | 'group' | 'contact'; publicId: string } =
      firstParticipant.type === 'email'
        ? {
            type: 'email',
            emailAddress: firstParticipant.address.toString()
          }
        : {
            type: firstParticipant.type,
            publicId: firstParticipantPublicId
          };
    const createNewConvoTrpc = $trpc.convos.createNewConvo.useMutation();

    const createNewConvo = await createNewConvoTrpc.mutate({
      firstMessageType: type,
      to: convoToValue,
      participantsOrgMembersPublicIds: convoParticipantsOrgMembersPublicIds,
      participantsGroupsPublicIds: convoParticipantsGroupPublicIds,
      participantsContactsPublicIds: convoParticipantsContactPublicIds,
      participantsEmails: convoParticipantsEmailPublicIds,
      sendAsEmailIdentityPublicId: selectedOrgEmailIdentities.value?.publicId,
      topic: conversationTopicInput.value,
      message: stringify(messageEditorData.value),
      attachments: attachmentUploads.value
    });

    if (createNewConvoTrpc.status.value === 'error') {
      actionLoading.value = false;
      toast.add({
        id: 'create_new_convo_fail',
        title: 'Conversation creation failed',
        description: `Conversation could not be created.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }

    navigateTo(`/${orgShortcode}/convo/${createNewConvo?.publicId}`);
  }
</script>
<template>
  <div class="flex h-full max-h-full w-full max-w-full flex-col gap-4 p-4">
    <div class="z-20000 from-base-1 mb-[-24px] h-[24px] bg-gradient-to-b" />
    <UnUiAlert
      v-if="
        orgEmailIdentities.length === 0 &&
        userEmailIdentitiesStatus === 'success'
      "
      icon="i-ph-warning-octagon"
      color="orange"
      description="You don't have an email identity assigned to you. Please contact your organization administrator. If you want to use a free @uninbox email address, please go to Settings > Personal Addresses > Claim Address."
      title="Email sending disabled!" />
    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium">Participants</span>
      <div class="flex flex-col gap-1">
        <div class="flex flex-col gap-2">
          <div class="flex flex-row flex-wrap gap-4">
            <NuxtUiSelectMenu
              v-model="participantLabels"
              placeholder="Select participants"
              :options="
                participantOptions as Array<{
                  [key: string]: any;
                  disabled?: boolean;
                }>
              "
              name="name"
              searchable
              multiple
              :searchable-placeholder="participantPlaceholder"
              option-attribute="keywords"
              class="w-full"
              :creatable="orgEmailIdentities.length !== 0">
              <template
                v-if="selectedParticipants"
                #label>
                <!-- <UnUiIcon
                  name="i-ph-check"
                  class="h-4 w-4" /> -->
                <div
                  v-if="selectedParticipants.length"
                  class="flex flex-wrap gap-3">
                  <div
                    v-for="(participant, index) in selectedParticipants"
                    :key="index"
                    class="flex flex-row items-center gap-2 truncate">
                    <span
                      v-if="hasEmailParticipants && index === 0"
                      class="leading-0 text-base-11 text-xs">
                      TO:
                    </span>
                    <div
                      v-if="participant.type === 'email'"
                      class="flex flex-row items-center gap-1">
                      <UnUiIcon :name="participant.icon" />
                      <span>
                        {{ participant.address }}
                      </span>
                    </div>
                    <div
                      v-if="participant.type === 'contact'"
                      class="flex flex-row items-center gap-1">
                      <UnUiAvatar
                        :public-id="participant.publicId"
                        :avatar-timestamp="participant.avatarTimestamp"
                        :type="'contact'"
                        :alt="participant.name.toString()"
                        size="xs" />
                      <span>
                        {{ participant.name }}
                      </span>
                    </div>
                    <div
                      v-if="participant.type === 'orgMember'"
                      class="flex flex-row items-center gap-1">
                      <UnUiAvatar
                        :public-id="participant.profilePublicId"
                        :avatar-timestamp="participant.avatarTimestamp"
                        :type="'orgMember'"
                        :alt="participant.name.toString()"
                        size="xs" />
                      <span>
                        {{ participant.name }}
                      </span>
                    </div>
                    <div
                      v-if="participant.type === 'group'"
                      class="flex flex-row items-center gap-1">
                      <UnUiAvatar
                        :public-id="participant.publicId"
                        :avatar-timestamp="participant.avatarTimestamp"
                        :type="'group'"
                        :alt="participant.name.toString()"
                        :color="participant.color as UiColor"
                        size="xs" />
                      <span>
                        {{ participant.name }}
                      </span>
                    </div>
                    <span
                      v-if="
                        hasEmailParticipants &&
                        index === 0 &&
                        selectedParticipants.length > 1
                      "
                      class="border-l-1 border-l-1 leading-0 text-base-11 ml-2 border-l pl-2 text-xs">
                      CC:
                    </span>
                  </div>
                </div>
                <span v-else>{{ participantPlaceholder }}</span>
              </template>
              <template #option="{ option }">
                <UnUiIcon :name="option.icon" />
                <div v-if="option.type === 'email'">
                  <span> {{ option.address }} </span>
                </div>
                <div
                  v-if="option.type === 'contact'"
                  class="flex flex-row items-center gap-2">
                  <UnUiAvatar
                    :public-id="option.publicId"
                    :avatar-timestamp="option.avatarTimestamp"
                    :type="'contact'"
                    :alt="option.name"
                    size="xs" />
                  <span>
                    {{ option.name }}
                  </span>
                  <span class="text-xs"> - {{ option.address }}</span>
                </div>
                <div
                  v-if="option.type === 'orgMember'"
                  class="flex flex-row items-center gap-2">
                  <UnUiAvatar
                    :public-id="option.profilePublicId"
                    :avatar-timestamp="option.avatarTimestamp"
                    :type="'orgMember'"
                    :alt="option.name"
                    size="xs" />
                  <span>
                    {{ option.own ? 'You' : option.name }}
                    <span
                      v-if="option.title"
                      class="text-xs">
                      - {{ option.title }}
                    </span>
                    <span
                      v-if="option.disabled && !option.own"
                      class="text-xs">
                      - Cant be added
                    </span>
                    <span
                      v-if="option.disabled && option.own"
                      class="text-xs">
                      - already a participant
                    </span>
                  </span>
                </div>
                <div
                  v-if="option.type === 'group'"
                  class="flex flex-row items-center gap-2">
                  <UnUiAvatar
                    :public-id="option.publicId"
                    :avatar-timestamp="option.avatarTimestamp"
                    :type="'group'"
                    :alt="option.name"
                    :color="option.color.toString()"
                    size="xs" />
                  <span>
                    {{ option.name }}
                  </span>
                </div>
              </template>
              <template #option-create="{ option }">
                <span class="flex-shrink-0">New Email:</span>
                <span class="block truncate">{{ option.keywords }}</span>
              </template>
            </NuxtUiSelectMenu>
          </div>
        </div>
      </div>
    </div>
    <div
      v-show="hasEmailParticipants"
      class="flex flex-col gap-2 transition-all"
      :class="hasEmailParticipants ? 'opacity-100' : 'h-0 opacity-0'">
      <span class="text-sm font-medium"> Send External Email As </span>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <div class="flex flex-row flex-wrap gap-8">
            <NuxtUiSelectMenu
              v-model="selectedOrgEmailIdentities"
              searchable
              :disabled="orgEmailIdentities.length === 0"
              :placeholder="orgEmailIdentitiesPlaceholder"
              :options="orgEmailIdentities"
              :ui="{
                wrapper: 'w-full',
                color: {
                  white: {
                    outline: emailButNoIdentityRingColor,
                    background: 'bg-base-1'
                  }
                }
              }">
              <template
                v-if="selectedOrgEmailIdentities"
                #label>
                <UnUiIcon
                  name="i-ph-check"
                  class="h-4 w-4" />
                <div
                  v-if="selectedOrgEmailIdentities"
                  class="flex flex-wrap gap-3">
                  <div class="flex flex-row items-center gap-1 truncate">
                    <span
                      >{{ selectedOrgEmailIdentities.sendName }}
                      <span class="text-base-11"
                        >- {{ selectedOrgEmailIdentities.address }}</span
                      >
                    </span>
                  </div>
                </div>
                <span v-else>Select email identity</span>
              </template>
              <template #option="{ option }">
                <span
                  >{{ option.sendName }}
                  <span class="text-base-11">- {{ option.address }}</span>
                </span>
              </template>
              <template #option-empty=""> No email identities found </template>
            </NuxtUiSelectMenu>
          </div>
        </div>
      </div>
    </div>
    <div class="flex w-full flex-col gap-2">
      <UnUiInput
        v-model:value="conversationTopicInput"
        v-model:valid="conversationSubjectInputValid"
        width="full"
        label="Topic"
        :schema="z.string().trim().min(1).max(128)" />
    </div>
    <span class="text-sm font-medium">Message</span>
    <UnEditor
      v-model:modelValue="messageEditorData"
      class="min-h-[150px] overflow-hidden" />

    <div
      v-if="attachmentUploads.length > 0"
      class="flex w-full max-w-full flex-row justify-between gap-2">
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
                    item.attachmentPublicId !== attachment.attachmentPublicId
                )
              " />
          </UnUiTooltip>
        </div>
      </div>

      <ConvosUpload
        v-model:uploadedAttachments="attachmentUploads"
        :max-size="15000000"
        :current-size="currentTotalUploadSize"
        :org-shortcode="orgShortcode">
        <template #default="{ openFileDialog, loading }">
          <UnUiButton
            label="Upload more"
            size="xs"
            variant="outline"
            :loading="loading"
            icon="i-ph-plus"
            @click="openFileDialog" />
        </template>
      </ConvosUpload>
    </div>

    <div
      class="flex w-full max-w-full grow flex-row items-center justify-end gap-2">
      <ConvosUpload
        v-if="attachmentUploads.length === 0"
        v-model:uploadedAttachments="attachmentUploads"
        :max-size="15000000"
        :current-size="currentTotalUploadSize"
        :org-shortcode="orgShortcode">
        <template #default="{ openFileDialog, loading }">
          <UnUiButton
            label="Attachment"
            variant="outline"
            :loading="loading"
            icon="i-ph-paperclip"
            @click="openFileDialog" />
        </template>
      </ConvosUpload>
      <!-- <UnUiButton
        label="Save Draft"
        color="amber"
        variant="outline"
        :disabled="!formValid || actionLoading"
        icon="i-ph-note" /> -->
      <UnUiButton
        label="Post Comment"
        color="yellow"
        variant="outline"
        :disabled="!formValid || actionLoading"
        icon="i-ph-note"
        @click="createNewConvo('comment')" />
      <UnUiButton
        label="Send Message"
        variant="outline"
        :disabled="!formValid || actionLoading"
        icon="i-ph-envelope"
        @click="createNewConvo('message')" />
    </div>
  </div>
</template>
