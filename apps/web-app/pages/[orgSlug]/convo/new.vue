<script setup lang="ts">
  import type { UiColor } from '@uninbox/types/ui';
  import { useTimeAgo } from '@vueuse/core';
  import { z } from 'zod';
  const { $trpc } = useNuxtApp();
  definePageMeta({
    layout: 'convos'
  });

  // TODO: handle if the domain is not valid/enabled. display the email address in the list but show it as disabled and show a tooltip on hover that says "this domain is not enabled for sending"
  interface OrgEmailIdentities {
    publicId: string;
    address: string;
    sendName: string | null;
  }
  const orgEmailIdentities = ref<OrgEmailIdentities[]>([]);
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

  const selectedOrgEmailIdentities = ref<OrgEmailIdentities | undefined>(
    undefined
  );

  // Participants
  interface OrgMembers {
    type: 'user';
    icon: 'i-ph-user';
    publicId: String;
    name: String;
    handle: String;
    avatarId: String | null;
    title: String | null;
    disabled?: boolean;
    keywords: String;
  }
  interface OrgUserGroups {
    type: 'group';
    icon: 'i-ph-users-three';
    publicId: String;
    name: String;
    description: String | null;
    avatarId: String | null;
    color: String | null;
    keywords: String;
  }
  interface EmailAddresses {
    type: 'email';
    icon: 'i-ph-envelope';
    publicId: number;
    address: string;
    keywords: String;
  }

  type ParticipantOptionsType = OrgMembers | OrgUserGroups | EmailAddresses;
  const participantOptions = ref<ParticipantOptionsType[]>([]);
  const selectedParticipantOptions = ref<ParticipantOptionsType[]>([]);

  function removeTypeFromParticipants(type: 'user' | 'group' | 'email') {
    selectedParticipantOptions.value = selectedParticipantOptions.value.filter(
      (participant) => participant.type !== type
    );
  }

  const participantLabels = computed({
    get: () => selectedParticipantOptions.value,
    set: async (labels) => {
      const promises = labels.map(async (label) => {
        if (label.publicId) {
          return label;
        }
        const newEntry: EmailAddresses = {
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

      selectedParticipantOptions.value = await Promise.all(promises);
    }
  });

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

  const orgMembers = ref<OrgMembers[]>([]);

  watch(orgMembersData, (newOrgMembersData) => {
    if (newOrgMembersData?.ownMembershipId) {
      const ownOrgMemberData = newOrgMembersData.members?.find(
        (member) => member.publicId === newOrgMembersData.ownMembershipId
      );
      if (!ownOrgMemberData) {
        throw new Error('own org member data not found');
      }
      const ownData: OrgMembers = {
        type: 'user',
        icon: 'i-ph-user',
        publicId: ownOrgMemberData.publicId,
        name:
          ownOrgMemberData.profile?.firstName +
            ' ' +
            ownOrgMemberData.profile?.lastName || '',
        handle: ownOrgMemberData.profile?.handle,
        avatarId: ownOrgMemberData.profile?.avatarId || '',
        title: ownOrgMemberData.profile?.title || '',
        disabled: true,
        keywords:
          ownOrgMemberData.profile?.firstName +
          ' ' +
          ownOrgMemberData.profile?.lastName +
          '  @' +
          ownOrgMemberData.profile?.handle +
          ' ' +
          ownOrgMemberData.profile?.title
      };
      orgMembers.value.push(ownData);
      selectedOrgMembers.value = [ownData];
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
          name:
            member.profile?.firstName + ' ' + member.profile?.lastName || '',
          handle: member.profile?.handle,
          avatarId: member.profile?.avatarId || '',
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
    removeTypeFromParticipants('user');
    removeTypeFromParticipants('group');
  });

  const selectedOrgMembers = ref<OrgMembers[]>([]);

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

  const orgUserGroups = ref<OrgUserGroups[]>([]);

  watch(orgUserGroupsData, (newOrgUserGroupsData) => {
    if (newOrgUserGroupsData?.groups) {
      for (const group of newOrgUserGroupsData.groups) {
        orgUserGroups.value.push({
          type: 'group',
          icon: 'i-ph-users-three',
          publicId: group.publicId,
          name: group.name,
          description: group.description,
          avatarId: group.avatarId,
          color: group.color,
          keywords: group.name + ' ' + group.description
        });
      }
      removeTypeFromParticipants('user');
      removeTypeFromParticipants('group');
      participantOptions.value = [
        ...orgMembers.value,
        ...orgUserGroups.value,
        ...participantOptions.value
      ];
    }
  });

  // FIX: TODO: DONT INCLUDE AUTHORS ID IN THE ARRAY OF USER PARTICIPANTS; SEND SEPARATELY

  // New Data
  const editorData = ref('');

  // Topic/subject+

  const conversationSubjectInput = ref('');
  const conversationSubjectInputValid = ref(false);
</script>
<template>
  <div class="h-full max-h-full max-w-full w-full flex flex-col gap-4">
    <div class="z-20000 mb-[-24px] h-[24px] from-base-1 bg-gradient-to-b" />
    <div class="flex flex-col gap-2">
      <span class="text-md font-display"> Send As </span>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span v-if="userEmailIdentitiesStatus === 'idle'">
            Select organization to load email identities
          </span>
          <span v-if="userEmailIdentitiesStatus === 'pending'">
            <UnUiIcon name="svg-spinners:3-dots-fade" /> Loading Email
            Identities
          </span>
          <div
            v-if="!userEmailIdentitiesPending"
            class="flex flex-row flex-wrap gap-8">
            <NuxtUiSelectMenu
              v-model="selectedOrgEmailIdentities"
              searchable
              :disabled="orgEmailIdentities.length === 0"
              :placeholder="
                orgEmailIdentities.length === 0
                  ? 'No email identities found'
                  : 'Select Email Identity'
              "
              :options="orgEmailIdentities"
              class="w-full">
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
    <div class="flex flex-col gap-2">
      <span class="text-md font-display">Participants</span>
      <div class="flex flex-col gap-1">
        <div class="flex flex-col gap-2">
          <!-- <span class="text-sm font-medium">Users</span> -->
          <span v-if="orgMembersStatus === 'pending'">
            <UnUiIcon name="svg-spinners:3-dots-fade" /> Loading Users
          </span>
          <div
            v-if="orgMembersStatus === 'success'"
            class="flex flex-row flex-wrap gap-4">
            <NuxtUiSelectMenu
              v-model="participantLabels"
              multiple
              placeholder="Select participants"
              :options="participantOptions"
              name="name"
              searchable
              searchable-placeholder="Search or type email..."
              option-attribute="keywords"
              class="w-full"
              creatable>
              <template
                v-if="selectedParticipantOptions"
                #label>
                <!-- <UnUiIcon
                  name="i-ph-check"
                  class="h-4 w-4" /> -->
                <div
                  v-if="selectedParticipantOptions.length"
                  class="flex flex-wrap gap-3">
                  <div
                    v-for="(participant, index) in selectedParticipantOptions"
                    :key="index"
                    class="flex flex-row items-center gap-1 truncate">
                    <div
                      v-if="participant.type === 'email'"
                      class="flex flex-row items-center gap-2">
                      <UnUiIcon :name="participant.icon" />
                      <span>
                        {{ participant.address }}
                      </span>
                    </div>
                    <div
                      v-if="participant.type === 'user'"
                      class="flex flex-row items-center gap-2">
                      <UnUiAvatar
                        :avatar-id="participant.avatarId?.toString()"
                        :alt="participant.name.toString()"
                        size="xs" />
                      <span>
                        {{ participant.name }}
                      </span>
                    </div>
                    <div
                      v-if="participant.type === 'group'"
                      class="flex flex-row items-center gap-2">
                      <UnUiAvatar
                        :avatar-id="participant.avatarId?.toString()"
                        :alt="participant.name.toString()"
                        :color="participant.color?.toString()"
                        size="xs" />
                      <span>
                        {{ participant.name }}
                      </span>
                    </div>
                  </div>
                </div>
                <span v-else>Select participants or type email address...</span>
              </template>
              <template #option="{ option }">
                <UnUiIcon :name="option.icon" />
                <div v-if="option.type === 'email'">
                  <span>
                    {{ option.address }}
                  </span>
                </div>
                <div
                  v-if="option.type === 'user'"
                  class="flex flex-row gap-2">
                  <UnUiAvatar
                    :avatar-id="option.avatarId"
                    :alt="option.name"
                    size="xs" />
                  <span>
                    {{ option.name }}
                    <span
                      v-if="option.title"
                      class="text-xs">
                      - {{ option.title }}
                    </span>
                    <span
                      v-if="option.disabled"
                      class="text-xs">
                      - Cant be removed
                    </span>
                  </span>
                </div>
                <div
                  v-if="option.type === 'group'"
                  class="flex flex-row gap-2">
                  <UnUiAvatar
                    :avatar-id="option.avatarId"
                    :alt="option.name"
                    :color="option.color as UiColor"
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
    <div class="w-full flex flex-col gap-2">
      <span class="text-md font-display">Topic</span>
      <UnUiInput
        v-model:value="conversationSubjectInput"
        v-model:valid="conversationSubjectInputValid"
        width="full"
        label="Conversation Subject"
        :schema="z.string().min(1).max(128)" />
    </div>

    <div class="w-full flex grow flex-col justify-items-end gap-2">
      <span class="text-md font-display">Message</span>
      <UnEditor
        v-model:modelValue="editorData"
        class="min-h-[300px] grow" />
      <div class="min-w-fit flex flex-row justify-end gap-2">
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
    <!-- <div class="mt-[24px] h-[24px] from-base-1 bg-gradient-to-t" /> -->
  </div>
</template>
