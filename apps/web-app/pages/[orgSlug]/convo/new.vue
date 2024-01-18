<script setup lang="ts">
  import type { JSONContent } from '@tiptap/vue-3';
  import type { UiColor } from '@uninbox/types/ui';
  import { useTimeAgo } from '@vueuse/core';
  import { stringify } from 'superjson';
  import { z } from 'zod';
  const { $trpc } = useNuxtApp();
  definePageMeta({
    layout: 'convos'
  });
  const orgSlug = useRoute().params.orgSlug as string;

  // TODO: handle if the domain is not valid/enabled. display the email address in the list but show it as disabled and show a tooltip on hover that says "this domain is not enabled for sending"
  interface OrgEmailIdentities {
    publicId: string;
    address: string;
    sendName: string | null;
  }

  interface ConvoParticipantOrgMembers {
    type: 'user';
    icon: 'i-ph-user';
    publicId: String;
    profilePublicId: String;
    name: String;
    handle: String;
    title: String | null;
    disabled?: Boolean;
    keywords: String;
    own?: Boolean;
  }
  interface ConvoParticipantOrgUserGroups {
    type: 'group';
    icon: 'i-ph-users-three';
    publicId: String;
    name: String;
    description: String | null;
    color: String | null;
    keywords: String;
  }
  interface ConvoParticipantOrgContacts {
    type: 'contact';
    icon: 'i-ph-address-book';
    publicId: String;
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
    | ConvoParticipantOrgUserGroups
    | ConvoParticipantOrgContacts
    | NewConvoParticipantEmailAddresses;

  //* Data Loading
  // Get email identities
  const {
    data: userEmailIdentitiesData,
    pending: userEmailIdentitiesPending,
    refresh: userEmailIdentitiesExecute,
    status: userEmailIdentitiesStatus
  } = await $trpc.org.mail.emailIdentities.getUserEmailIdentities.useLazyQuery(
    {},
    {
      server: false
    }
  );

  // get list of users
  const {
    data: orgMembersData,
    pending: orgMembersPending,
    execute: orgMembersExecute,
    status: orgMembersStatus
  } = await $trpc.org.users.members.getOrgMembersList.useLazyQuery(
    {},
    {
      server: false
    }
  );

  // get list of groups
  const {
    data: orgUserGroupsData,
    pending: orgUserGroupsPending,
    execute: orgUserGroupsExecute,
    status: orgUserGroupsStatus
  } = await $trpc.org.users.userGroups.getOrgUserGroups.useLazyQuery(
    {},
    {
      server: false
    }
  );

  // get list of org contacts
  const {
    data: orgContactsData,
    pending: orgContactsPending,
    execute: orgContactsExecute,
    status: orgContactsStatus
  } = await $trpc.org.contacts.getOrgContacts.useLazyQuery(
    {},
    {
      server: false
    }
  );

  //* List Data
  const orgEmailIdentities = ref<OrgEmailIdentities[]>([]);
  const orgMembers = ref<ConvoParticipantOrgMembers[]>([]);
  const orgUserGroups = ref<ConvoParticipantOrgUserGroups[]>([]);
  const orgContacts = ref<ConvoParticipantOrgContacts[]>([]);

  //* Data Watchers
  function setParticipantOptions() {
    participantOptions.value = [
      ...orgMembers.value,
      ...orgUserGroups.value,
      ...orgContacts.value
    ];
  }

  watch(userEmailIdentitiesData, (newuserEmailIdentitiesData) => {
    orgEmailIdentities.value = [];
    selectedOrgEmailIdentities.value = undefined;
    if (newuserEmailIdentitiesData?.emailIdentities) {
      for (const orgObject of newuserEmailIdentitiesData.emailIdentities) {
        orgEmailIdentities.value.push({
          publicId: orgObject.publicId,
          address: orgObject.username + '@' + orgObject.domainName,
          sendName: orgObject.sendName
        });
      }
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
        type: 'user',
        icon: 'i-ph-user',
        publicId: ownOrgMemberData.publicId,
        profilePublicId: ownOrgMemberData.profile.publicId,
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
          type: 'user',
          icon: 'i-ph-user',
          publicId: member.publicId,
          profilePublicId: member.profile.publicId,
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

  watch(orgUserGroupsData, (newOrgUserGroupsData) => {
    if (newOrgUserGroupsData?.groups) {
      for (const group of newOrgUserGroupsData.groups) {
        orgUserGroups.value.push({
          type: 'group',
          icon: 'i-ph-users-three',
          publicId: group.publicId,
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
      ? 'ring-red-500 dark:ring-red-400'
      : 'ring-gray-200 dark:ring-gray-700';
  });

  const participantLabels = computed({
    get: () => selectedParticipants.value,
    set: async (labels) => {
      const promises = labels.map(async (label) => {
        if (label.publicId) {
          return label;
        }
        const isEmail = z.string().email().safeParse(label.keywords);
        if (!isEmail.success) {
          return;
        }
        const newEntry: NewConvoParticipantEmailAddresses = {
          type: 'email',
          icon: 'i-ph-envelope',
          publicId: participantOptions.value.length + 1,
          //@ts-ignore
          address: label.keywords,
          keywords: label.keywords
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
      orgUserGroupsStatus.value !== 'success' ||
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
    console.log(
      'formValid',
      !hasEmailParticipantsNoEmailIdentitySelected.value &&
        selectedParticipants.value.length > 0 &&
        conversationTopicInput.value.length > 0 &&
        isTextPresent.value,
      {
        hasEmailParticipantsNoEmailIdentitySelected:
          !hasEmailParticipantsNoEmailIdentitySelected.value
      },
      {
        selectedParticipantOptionsLength: selectedParticipants.value.length > 0
      },
      { conversationTopicInput: conversationTopicInput.value.length > 0 },
      { istext: isTextPresent.value }
    );
    return (
      !hasEmailParticipantsNoEmailIdentitySelected.value &&
      selectedParticipants.value.length > 0 &&
      conversationTopicInput.value.length > 0 &&
      isTextPresent.value
    );
  });

  const messageEditorData = ref<JSONContent>({});

  const isTextPresent = computed(() => {
    const contentArray = messageEditorData.value?.content;
    if (!contentArray) return false;
    if (contentArray.length === 0) return false;
    if (!contentArray[0].content || contentArray[0].content.length === 0)
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
    console.log('🔥 create new convo function');
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

    const convoParticipantsOrgMembersPublicIds = getPublicIdsByType('user');
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
      | { type: 'user' | 'group' | 'contact'; publicId: string } =
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
    await createNewConvoTrpc.mutate({
      firstMessageType: type,
      to: convoToValue,
      participantsOrgMembersPublicIds: convoParticipantsOrgMembersPublicIds,
      participantsGroupsPublicIds: convoParticipantsGroupPublicIds,
      participantsContactsPublicIds: convoParticipantsContactPublicIds,
      participantsEmails: convoParticipantsEmailPublicIds,
      sendAsEmailIdentityPublicId: selectedOrgEmailIdentities.value?.publicId,
      topic: conversationTopicInput.value,
      message: stringify(messageEditorData.value)
    });

    if (createNewConvoTrpc.error) {
      actionLoading.value = false;
    } else {
      toast.add({
        title: 'Conversation created',
        icon: 'i-ph-thumbs-up',
        timeout: 5000
      });
      setTimeout(() => {
        navigateTo(
          `/${orgSlug}/convo/${createNewConvoTrpc.data.value?.publicId}`
        );
      }, 1500);
    }
  }
</script>
<template>
  <div class="h-full max-h-full max-w-full w-full flex flex-col gap-4">
    <div class="z-20000 mb-[-24px] h-[24px] from-base-1 bg-gradient-to-b" />
    <UnUiAlert
      v-if="
        orgEmailIdentities.length === 0 &&
        userEmailIdentitiesStatus === 'success'
      "
      icon="i-ph-warning-octagon"
      color="orange"
      description="You don't have an email identity assigned to you. Please contact your organization administrator."
      title="Email sending disabled!" />
    {{ messageEditorData }}
    <span>{{ selectedParticipants }}</span>
    <span>{{ orgMembersData }}</span>
    <span>has email {{ hasEmailParticipants }}</span>
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
                      class="text-gray-400 dark:text-gray-600 text-xs leading-0">
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
                        :public-id="participant.publicId?.toString()"
                        :type="'contact'"
                        :alt="participant.name.toString()"
                        size="xs" />
                      <span>
                        {{ participant.name }}
                      </span>
                    </div>
                    <div
                      v-if="participant.type === 'user'"
                      class="flex flex-row items-center gap-1">
                      <UnUiAvatar
                        :public-id="participant.profilePublicId.toString()"
                        :type="'user'"
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
                        :public-id="participant.publicId?.toString()"
                        :type="'group'"
                        :alt="participant.name.toString()"
                        :color="participant.color?.toString()"
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
                      class="text-gray-400 dark:text-gray-600 ml-2 border-l border-l-1 border-l-1 pl-2 text-xs leading-0">
                      CC:
                    </span>
                  </div>
                </div>
                <span v-else>{{ participantPlaceholder }}</span>
              </template>
              <template #option="{ option }">
                <UnUiIcon :name="option.icon" />
                <div v-if="option.type === 'email'">
                  <span>
                    {{ option.address }}
                  </span>
                </div>
                <div
                  v-if="option.type === 'contact'"
                  class="flex flex-row items-center gap-2">
                  <UnUiAvatar
                    :public-id="option.publicId"
                    :type="'contact'"
                    :alt="option.name"
                    size="xs" />
                  <span>
                    {{ option.name }}
                  </span>
                  <span class="text-xs"> - {{ option.address }}</span>
                </div>
                <div
                  v-if="option.type === 'user'"
                  class="flex flex-row items-center gap-2">
                  <UnUiAvatar
                    :public-id="option.profilePublicId"
                    :type="'user'"
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
      :class="hasEmailParticipants ? 'opacity-100' : 'opacity-0 h-0'">
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
                    background: 'bg-white dark:bg-gray-800'
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
                      <span class="text-gray-800 dark:text-gray-300"
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
                  <span class="text-gray-800 dark:text-gray-300"
                    >- {{ option.address }}</span
                  >
                </span>
              </template>
              <template #option-empty=""> No email identities found </template>
            </NuxtUiSelectMenu>
          </div>
        </div>
      </div>
    </div>
    <div class="w-full flex flex-col gap-2">
      <UnUiInput
        v-model:value="conversationTopicInput"
        v-model:valid="conversationSubjectInputValid"
        width="full"
        label="Topic"
        :schema="z.string().trim().min(1).max(128)" />
    </div>

    <div
      class="h-full max-h-full w-full flex flex-col justify-items-end gap-2 overflow-hidden">
      <span class="text-sm font-medium">Message</span>
      <UnEditor
        v-model:modelValue="messageEditorData"
        class="min-h-[150px] overflow-hidden" />
    </div>
    <div class="flex grow flex-row justify-end gap-2">
      <UnUiButton
        label="Save Draft"
        color="orange"
        variant="outline"
        :disabled="!formValid || actionLoading"
        icon="i-ph-note" />
      <UnUiButton
        label="Post Note"
        color="yellow"
        variant="outline"
        :disabled="!formValid || actionLoading"
        icon="i-ph-note" />
      <UnUiButton
        label="Send Message"
        variant="outline"
        :disabled="!formValid || actionLoading"
        icon="i-ph-envelope"
        @click="createNewConvo('message')" />
    </div>
  </div>
</template>
