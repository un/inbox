<script setup lang="ts">
  import { UiColor } from '@uninbox/types/ui';
  import { useTimeAgo } from '@vueuse/core';
  import { z } from 'zod';
  const { $trpc } = useNuxtApp();
  definePageMeta({
    layout: 'convos'
  });

  // Primary areas of form
  const sendAsExpanded = ref(true);
  const showPersonalAddress = ref(false);
  const sendAsSummaryString = ref('');
  const participantsExpanded = ref(false);
  const topicExpanded = ref(false);
  const bodyExpanded = ref(false);

  // orgs
  const activeOrg = ref({ publicId: '' });
  const computedOrgPublicIdInput = computed(() => {
    return {
      orgPublicId: activeOrg.value.publicId
    };
  });
  const { data: userOrgsData, pending: userOrgsPending } =
    await $trpc.org.crud.getUserOrgs.useLazyQuery(
      {
        includePersonal: true
      },
      {
        server: false
      }
    );

  function setActiveOrg(orgPublicId: string, personal?: true) {
    if (personal) {
      showPersonalAddress.value = true;
    } else {
      showPersonalAddress.value = false;
    }
    activeOrg.value.publicId = orgPublicId;
    userEmailIdentitiesExecute();
    orgUserGroupsExecute();
    orgMembersExecute();
  }

  // TODO: handle if the domain is not valid/enabled. display the email address in the list but show it as disabled and show a tooltip on hover that says "this domain is not enabled for sending"
  const {
    data: userEmailIdentitiesData,
    pending: userEmailIdentitiesPending,
    refresh: userEmailIdentitiesExecute,
    status: userEmailIdentitiesStatus
  } = await $trpc.user.addresses.getUserEmailIdentities.useLazyQuery(
    computedOrgPublicIdInput,
    {
      server: false,
      immediate: false
    }
  );

  const { data: userPersonalAddressesData } =
    await $trpc.user.addresses.getPersonalAddresses.useLazyQuery(
      {},
      {
        server: false
      }
    );
  // send as
  const activeSendAs = ref<string>('');
  function setActiveSendAs(identityId: string, name: string) {
    sendAsSummaryString.value = name;
    activeSendAs.value = identityId;
    sendAsExpanded.value = false;
  }

  // Participants
  // get list of groups

  const {
    data: orgUserGroupsData,
    pending: orgUserGroupsPending,
    execute: orgUserGroupsExecute,
    status: orgUserGroupsStatus
  } = await $trpc.org.users.userGroups.getOrgUserGroups.useLazyQuery(
    computedOrgPublicIdInput,
    {
      server: false,
      immediate: false
    }
  );

  // get list of users
  const {
    data: orgMembersData,
    pending: orgMembersPending,
    execute: orgMembersExecute,
    status: orgMembersStatus
  } = await $trpc.org.users.members.getOrgMembersList.useLazyQuery(
    computedOrgPublicIdInput,
    {
      server: false,
      immediate: false
    }
  );

  const userOrgMembershipPublicId = ref('');
  watch(orgMembersData, () => {
    userOrgMembershipPublicId.value =
      orgMembersData.value?.ownMembershipId || '';
    newIdentityRouteToUsersOrgMemberPublicIds.value = [];
    newIdentityRouteToUsersOrgMemberPublicIds.value.push(
      userOrgMembershipPublicId.value
    );
  });

  // New Data
  const editorData = ref('');

  const newIdentityRouteToGroupsPublicIds = ref<string[]>([]);
  const newIdentityRouteToUsersOrgMemberPublicIds = ref<string[]>([]);

  function addUserGroupToRoute(groupPublicId: string) {
    newIdentityRouteToGroupsPublicIds.value.push(groupPublicId);
  }
  function removeUserGroupFromRoute(groupPublicId: string) {
    newIdentityRouteToGroupsPublicIds.value =
      newIdentityRouteToGroupsPublicIds.value.filter(
        (id) => id !== groupPublicId
      );
  }
  function addUserToRoute(userPublicId: string) {
    newIdentityRouteToUsersOrgMemberPublicIds.value.push(userPublicId);
  }
  function removeUserFromRoute(userPublicId: string) {
    newIdentityRouteToUsersOrgMemberPublicIds.value =
      newIdentityRouteToUsersOrgMemberPublicIds.value.filter(
        (id) => id !== userPublicId
      );
  }

  // External Email Addresses

  const externalEmailAddresses = ref<string[]>([]);
  const externalEmailAddressesInput = ref('');
  const externalEmailAddressesInputValid = ref(false);
  const externalEmailAddressesInputError = ref('');

  function addExternalEmailAddress() {
    if (externalEmailAddressesInputValid.value) {
      externalEmailAddresses.value.push(externalEmailAddressesInput.value);
      externalEmailAddressesInput.value = '';
      externalEmailAddressesInputValid.value = true;
    }
  }
  function removeExternalEmailAddress(address: string) {
    externalEmailAddresses.value = externalEmailAddresses.value.filter(
      (a) => a !== address
    );
  }

  // Topic/subject+

  const conversationSubjectInput = ref('');
  const conversationSubjectInputValid = ref(false);
</script>
<template>
  <div class="h-full max-h-full max-w-full w-full flex flex-col gap-2">
    <span class="text-lg font-display"> Organization </span>
    <span v-if="userOrgsPending">
      <icon name="svg-spinners:3-dots-fade" /> Loading Organizations
    </span>
    <div
      v-if="!userOrgsPending"
      class="flex flex-row flex-wrap gap-8">
      <div
        v-for="org of userOrgsData?.personalOrgs"
        :key="org.org.publicId">
        <div
          class="w-fit flex flex-row items-center gap-4 rounded-xl bg-base-2 p-1">
          <UnUiAvatar
            :avatar-id="org.org.avatarId || ''"
            :name="org.org.name"
            size="xs" />
          <span class="font-mono">
            {{ org.org.name }}
          </span>
          <button
            class="flex flex-row items-center gap-2 rounded-lg px-2 py-2"
            :class="
              activeOrg.publicId === org.org.publicId
                ? 'bg-primary-9'
                : 'bg-base-5'
            "
            @click="setActiveOrg(org.org.publicId, true)">
            <icon
              :name="
                activeOrg.publicId === org.org.publicId
                  ? 'ph:check-bold'
                  : 'ph:x-bold'
              "
              size="16" />
          </button>
        </div>
      </div>
      <div
        v-for="org of userOrgsData?.userOrgs"
        :key="org.org.publicId">
        <div
          class="w-fit flex flex-row items-center gap-4 rounded-xl bg-base-2 p-1">
          <UnUiAvatar
            :avatar-id="org.org.avatarId || ''"
            :name="org.org.name"
            size="xs" />
          <span class="font-mono">
            {{ org.org.name }}
          </span>
          <button
            class="flex flex-row items-center gap-2 rounded-lg px-2 py-2"
            :class="
              activeOrg.publicId === org.org.publicId
                ? 'bg-primary-9'
                : 'bg-base-5'
            "
            @click="setActiveOrg(org.org.publicId)">
            <icon
              :name="
                activeOrg.publicId === org.org.publicId
                  ? 'ph:check-bold'
                  : 'ph:x-bold'
              "
              size="16" />
          </button>
        </div>
      </div>
    </div>
    <div class="h-full max-h-full flex grow flex-col gap-8 overflow-hidden">
      <div class="z-20000 mb-[-24px] h-[24px] from-base-1 bg-gradient-to-b" />

      <div class="flex flex-col gap-4">
        <div class="flex flex-row flex-wrap items-center gap-4">
          <span class="text-lg font-display">Send As</span>
          <div
            v-if="!sendAsExpanded"
            class="flex flex-row items-center gap-2">
            <span class="font-mono">{{ sendAsSummaryString }}</span>
            <button
              class="py-2bg-base-5 flex flex-row items-center gap-2 rounded-lg px-2"
              @click="sendAsExpanded = !sendAsExpanded">
              <icon name="ph:pencil" />
            </button>
          </div>
        </div>
        <div
          v-if="sendAsExpanded"
          class="flex flex-col gap-1">
          <span v-if="userEmailIdentitiesStatus === 'idle'"> </span>
          <span v-if="userEmailIdentitiesStatus === 'pending'">
            <icon name="svg-spinners:3-dots-fade" /> Loading Email Identities
          </span>
          <div
            v-if="!userEmailIdentitiesPending && showPersonalAddress"
            class="flex flex-row flex-wrap gap-8">
            <div
              v-for="identity of userPersonalAddressesData?.personalEmailAddresses"
              :key="identity.publicId">
              <div
                class="w-fit flex flex-row items-center gap-4 rounded-xl bg-base-2 p-1">
                <span class="font-mono">
                  {{ identity.sendName }}
                </span>
                <span class="font-mono">
                  {{ identity.username }}@{{ identity.domainName }}
                </span>
                <button
                  class="flex flex-row items-center gap-2 rounded-lg px-2 py-2"
                  :class="
                    activeSendAs === identity.publicId
                      ? 'bg-primary-9'
                      : 'bg-base-5'
                  "
                  @click="
                    setActiveSendAs(
                      identity.publicId,
                      `${identity.sendName} - ${identity.username}@${identity.domainName}`
                    )
                  ">
                  <icon
                    :name="
                      activeSendAs === identity.publicId
                        ? 'ph:check-bold'
                        : 'ph:x-bold'
                    "
                    size="16" />
                </button>
              </div>
            </div>
          </div>
          <div
            v-if="!userEmailIdentitiesPending"
            class="flex flex-row flex-wrap gap-8">
            <div
              v-if="
                showPersonalAddress
                  ? userPersonalAddressesData?.personalEmailAddresses.length ===
                    0
                  : userEmailIdentitiesData?.emailIdentities.length === 0
              ">
              No Email Identities Found
            </div>
            <div
              v-for="identity of userEmailIdentitiesData?.emailIdentities"
              :key="identity.publicId">
              <div
                class="w-fit flex flex-row items-center gap-4 rounded-xl bg-base-2 p-1">
                <span class="font-mono">
                  {{ identity.sendName }}
                </span>
                <span class="font-mono">
                  {{ identity.username }}@{{ identity.domainName }}
                </span>
                <button
                  class="flex flex-row items-center gap-2 rounded-lg px-2 py-2"
                  :class="
                    activeSendAs === identity.publicId
                      ? 'bg-primary-9'
                      : 'bg-base-5'
                  "
                  @click="
                    setActiveSendAs(
                      identity.publicId,
                      `${identity.sendName} - ${identity.username}@${identity.domainName}`
                    )
                  ">
                  <icon
                    :name="
                      activeSendAs === identity.publicId
                        ? 'ph:check-bold'
                        : 'ph:x-bold'
                    "
                    size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <span class="text-lg font-display">Participants</span>
        <div class="flex flex-col gap-1">
          <div class="flex flex-row flex-wrap gap-4">
            <div class="flex flex-col gap-2">
              <span class="text-sm font-medium">Users</span>
              <span v-if="orgMembersStatus === 'pending'">
                <icon name="svg-spinners:3-dots-fade" /> Loading Users
              </span>
              <div
                v-if="orgMembersStatus === 'success'"
                class="flex flex-row flex-wrap gap-4">
                <template
                  v-for="member of orgMembersData?.members"
                  :key="member.publicId">
                  <div
                    v-if="member.publicId === userOrgMembershipPublicId"
                    class="flex flex-row items-center gap-8 rounded-xl bg-base-2 p-2">
                    <div class="flex flex-row items-center gap-4">
                      <UnUiAvatar
                        :avatar-id="member.profile?.avatarId || ''"
                        :name="
                          member.profile?.firstName +
                          ' ' +
                          member.profile?.lastName
                        "
                        size="xs" />
                      <div class="flex flex-col gap-1">
                        <div class="h-[16px] flex flex-row items-center gap-1">
                          <span class="font-semibold leading-none">
                            {{
                              member.profile?.firstName +
                              ' ' +
                              member.profile?.lastName
                            }}
                          </span>
                          <UnUiTooltip
                            v-if="member.role === 'admin'"
                            text="Organization Admin"
                            class="h-[16px] w-[16px]">
                            <icon
                              name="ph:crown"
                              class="text-yellow-8"
                              size="16" />
                          </UnUiTooltip>
                        </div>
                        <span class="leading-none">
                          @{{ member.profile?.handle }}
                        </span>
                      </div>
                    </div>
                    <button
                      class="flex flex-row items-center gap-2 rounded-lg px-2 py-2"
                      :class="
                        newIdentityRouteToUsersOrgMemberPublicIds.includes(
                          member.publicId
                        )
                          ? 'bg-primary-9'
                          : 'bg-base-5'
                      ">
                      <icon
                        :name="
                          newIdentityRouteToUsersOrgMemberPublicIds.includes(
                            member.publicId
                          )
                            ? 'ph:check-bold'
                            : 'ph:x-bold'
                        "
                        size="16" />
                    </button>
                  </div>
                </template>
                <template
                  v-for="member of orgMembersData?.members"
                  :key="member.publicId">
                  <div
                    v-if="member.publicId !== userOrgMembershipPublicId"
                    class="flex flex-row items-center gap-8 rounded-xl bg-base-2 p-2">
                    <div class="flex flex-row items-center gap-4">
                      <UnUiAvatar
                        :avatar-id="member.profile?.avatarId || ''"
                        :name="
                          member.profile?.firstName +
                          ' ' +
                          member.profile?.lastName
                        "
                        size="xs" />
                      <div class="flex flex-col gap-1">
                        <div class="h-[16px] flex flex-row items-center gap-1">
                          <span class="font-semibold leading-none">
                            {{
                              member.profile?.firstName +
                              ' ' +
                              member.profile?.lastName
                            }}
                          </span>
                          <UnUiTooltip
                            v-if="member.role === 'admin'"
                            text="Organization Admin"
                            class="h-[16px] w-[16px]">
                            <icon
                              name="ph:crown"
                              class="text-yellow-8"
                              size="16" />
                          </UnUiTooltip>
                        </div>
                        <span class="leading-none">
                          @{{ member.profile?.handle }}
                        </span>
                      </div>
                    </div>
                    <button
                      class="flex flex-row items-center gap-2 rounded-lg px-2 py-2"
                      :class="
                        newIdentityRouteToUsersOrgMemberPublicIds.includes(
                          member.publicId
                        )
                          ? 'bg-primary-9'
                          : 'bg-base-5'
                      "
                      @click="
                        newIdentityRouteToUsersOrgMemberPublicIds.includes(
                          member.publicId
                        )
                          ? removeUserFromRoute(member.publicId)
                          : addUserToRoute(member.publicId)
                      ">
                      <icon
                        :name="
                          newIdentityRouteToUsersOrgMemberPublicIds.includes(
                            member.publicId
                          )
                            ? 'ph:check-bold'
                            : 'ph:x-bold'
                        "
                        size="16" />
                    </button>
                  </div>
                </template>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <span class="text-sm font-medium">Groups</span>
              <span v-if="orgUserGroupsStatus === 'pending'">
                <icon name="svg-spinners:3-dots-fade" /> Loading User Groups
              </span>
              <div
                v-if="orgUserGroupsStatus === 'success'"
                class="flex flex-row flex-wrap gap-4">
                <span v-if="orgUserGroupsData?.groups.length === 0">
                  No Groups Found
                </span>
                <template
                  v-for="group of orgUserGroupsData?.groups"
                  :key="group.publicId">
                  <div
                    class="flex flex-row items-center gap-8 rounded-xl bg-base-2 p-2">
                    <div class="flex flex-row items-center gap-4">
                      <UnUiAvatar
                        :avatar-id="group.avatarId || ''"
                        :name="group.name"
                        :color="group.color as UiColor"
                        size="xs" />
                      <div class="flex flex-col gap-1">
                        <span class="font-semibold leading-none">
                          {{ group.name }}
                        </span>
                      </div>
                    </div>
                    <button
                      class="flex flex-row items-center gap-2 rounded-lg px-2 py-2"
                      :class="
                        newIdentityRouteToGroupsPublicIds.includes(
                          group.publicId
                        )
                          ? 'bg-primary-9'
                          : 'bg-base-5'
                      "
                      @click="
                        newIdentityRouteToGroupsPublicIds.includes(
                          group.publicId
                        )
                          ? removeUserGroupFromRoute(group.publicId)
                          : addUserGroupToRoute(group.publicId)
                      ">
                      <icon
                        :name="
                          newIdentityRouteToGroupsPublicIds.includes(
                            group.publicId
                          )
                            ? 'ph:check-bold'
                            : 'ph:x-bold'
                        "
                        size="16" />
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium">External Email</span>

            <div class="flex flex-row flex-wrap gap-4">
              <template
                v-for="address of externalEmailAddresses"
                :key="address">
                <div
                  class="flex flex-row items-center gap-8 rounded-xl bg-base-2 p-2">
                  <div class="flex flex-row items-center gap-4">
                    <div class="flex flex-col gap-1">
                      <div class="h-[16px] flex flex-row items-center gap-1">
                        <span class="font-semibold leading-none">
                          {{ address }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    class="flex flex-row items-center gap-2 rounded-lg px-2 py-2"
                    :class="
                      externalEmailAddresses.includes(address)
                        ? 'bg-primary-9'
                        : 'bg-base-5'
                    "
                    @click="
                      externalEmailAddresses.includes(address)
                        ? removeExternalEmailAddress(address)
                        : addExternalEmailAddress()
                    ">
                    <icon
                      :name="
                        externalEmailAddresses.includes(address)
                          ? 'ph:check-bold'
                          : 'ph:x-bold'
                      "
                      size="16" />
                  </button>
                </div>
              </template>
              <div class="flex flex-row items-end gap-2">
                <UnUiInputInline
                  v-model:value="externalEmailAddressesInput"
                  v-model:valid="externalEmailAddressesInputValid"
                  label=""
                  :schema="z.string().email()"
                  @keyup.enter="addExternalEmailAddress()" />
                <button
                  class="h-min max-w-80 flex flex-row items-center justify-center gap-2 border-1 border-base-7 rounded bg-base-3 px-2 py-1.5"
                  @click="addExternalEmailAddress()">
                  <icon
                    name="ph-plus"
                    size="20" />
                  <p class="text-sm">Add</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="w-full flex flex-col gap-4">
        <span class="text-lg font-display">Topic</span>
        <UnUiInput
          v-model:value="conversationSubjectInput"
          v-model:valid="conversationSubjectInputValid"
          width="full"
          label="Conversation Subject"
          :schema="z.string().min(1).max(64)" />
      </div>

      <div class="w-full flex flex-col justify-items-end gap-2">
        <span class="text-lg font-display">Message</span>
        <UnEditor
          v-model:modelValue="editorData"
          class="" />
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
      <div class="mt-[24px] h-[24px] from-base-1 bg-gradient-to-t" />
    </div>
  </div>
</template>
