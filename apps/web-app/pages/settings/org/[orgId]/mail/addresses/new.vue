<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { UiColor } from '@uninbox/types/ui';
  import { z } from 'zod';
  import trpcClient from '~/plugins/trpcClient';
  const { $trpc, $i18n } = useNuxtApp();

  const newIdentityUsernameValue = ref('');
  const newIdentityUsernameValid = ref<boolean | 'remote' | null>(null);
  const newIdentitySendNameValue = ref('');
  const newIdentitySendNameValid = ref<boolean | 'remote' | null>(null);
  const newIdentityCatchAll = ref(false);
  const newIdentityDomainPublicId = ref('');
  const newIdentityDomainName = ref('');
  const newIdentityRouteToGroupsPublicIds = ref<string[]>([]);
  const newIdentityRouteToUsersOrgMemberPublicIds = ref<string[]>([]);

  const buttonLabel = ref('Create New Email Address');
  const buttonLoading = ref(false);

  const formValid = computed(() => {
    return (
      newIdentityUsernameValid.value === true &&
      newIdentitySendNameValid.value === true &&
      (newIdentityRouteToGroupsPublicIds.value.length > 0 ||
        newIdentityRouteToUsersOrgMemberPublicIds.value.length > 0)
    );
  });

  const route = useRoute();

  const orgPublicId = route.params.orgId as string;

  // get list of domains
  const { data: orgDomainsData, pending: orgDomainsPending } =
    await $trpc.org.mail.domains.getOrgDomains.useLazyQuery({
      orgPublicId: orgPublicId
    });
  // get list of groups
  const { data: orgUserGroupsData, pending: orgUserGroupPending } =
    await $trpc.org.userGroups.getOrgUserGroups.useLazyQuery({
      orgPublicId: orgPublicId
    });

  // get list of users
  const { data: orgMembersData, pending: orgMembersPending } =
    await $trpc.org.members.getOrgMembersList.useLazyQuery({
      orgPublicId: orgPublicId
    });

  function setActiveDomain(domainPublicId: string) {
    newIdentityDomainPublicId.value = domainPublicId;
    newIdentityDomainName.value =
      orgDomainsData?.value?.domainData?.find(
        (domain) => domain.publicId === domainPublicId
      )?.domain || '';
  }
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

  async function createNewEmailIdentity() {
    buttonLoading.value = true;
    buttonLabel.value = 'Creating...';
    const { emailIdentity: newEmailIdentityPublicId } =
      await $trpc.org.mail.emailIdentities.createNewEmailIdentity.mutate({
        orgPublicId,
        emailUsername: newIdentityUsernameValue.value,
        domainPublicId: newIdentityDomainPublicId.value,
        sendName: newIdentitySendNameValue.value,
        routeToGroupsPublicIds: newIdentityRouteToGroupsPublicIds.value,
        routeToUsersOrgMemberPublicIds:
          newIdentityRouteToUsersOrgMemberPublicIds.value,
        catchAll: newIdentityCatchAll.value
      });
    buttonLoading.value = false;
    buttonLabel.value = 'Done... Redirecting';
    setTimeout(() => {
      navigateTo(
        `/settings/org/${orgPublicId}/mail/addresses/${newEmailIdentityPublicId}/?new=true`
      );
    }, 1500);
  }
</script>

<template>
  <div
    class="flex flex-col w-full h-full items-start p-4 gap-8 overflow-y-scroll">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <UnUiTooltip text="Back to Email Address list">
          <icon
            name="ph-arrow-left"
            size="32"
            @click="navigateTo('./')" />
        </UnUiTooltip>
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Add a new Email Address</span>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <UnUiInput
        label="Send Name"
        :schema="z.string().min(2)"
        :helper="`The name that will appear in the 'From' field of emails sent from this address`"
        v-model:value="newIdentitySendNameValue"
        v-model:valid="newIdentitySendNameValid" />
      <div class="flex flex-row gap-4 items-end">
        <UnUiInput
          label="Username"
          :schema="z.string().min(2)"
          v-model:value="newIdentityUsernameValue"
          v-model:valid="newIdentityUsernameValid" />
        <span
          v-if="newIdentityDomainName"
          class="font-mono mb-2">
          @{{ newIdentityDomainName }}</span
        >
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-xs font-medium">Domain</span>
        <span v-if="orgDomainsPending">
          <icon name="svg-spinners:3-dots-fade" /> Loading Domains
        </span>
        <div
          class="flex flex-row gap-8 flex-wrap"
          v-if="!orgDomainsPending">
          <div v-for="domain of orgDomainsData?.domainData">
            <div
              class="flex flex-row bg-base-2 p-2 rounded-xl items-center w-fit gap-4">
              <span class="font-mono">
                {{ domain.domain }}
              </span>
              <button
                @click="setActiveDomain(domain.publicId)"
                class="px-2 py-2 rounded-lg flex flex-row gap-2 items-center"
                :class="
                  newIdentityDomainPublicId === domain.publicId
                    ? 'bg-primary-9'
                    : 'bg-base-5'
                ">
                <icon
                  :name="
                    newIdentityDomainPublicId === domain.publicId
                      ? 'ph:check-bold'
                      : 'ph:x-bold'
                  "
                  size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium">Route messages to</span>

        <div class="flex flex-col gap-2">
          <span class="text-xs">User Groups</span>
          <span v-if="orgUserGroupPending">
            <icon name="svg-spinners:3-dots-fade" /> Loading User Groups
          </span>
          <div
            class="flex flex-row gap-4 flex-wrap"
            v-if="!orgUserGroupPending">
            <template v-for="group of orgUserGroupsData?.groups">
              <div
                class="flex flex-row gap-8 bg-base-2 p-2 rounded-xl items-center">
                <div class="flex flex-row gap-4 items-center">
                  <UnUiAvatar
                    :avatar-id="group.avatarId || ''"
                    :name="group.name"
                    :color="group.color as UiColor"
                    size="xs" />
                  <div class="flex flex-col gap-1">
                    <span class="font-semibold leading-none">
                      {{ group.name }}
                    </span>

                    <span class="leading-none"> {{ group.description }} </span>
                  </div>
                </div>
                <button
                  @click="
                    newIdentityRouteToGroupsPublicIds.includes(group.publicId)
                      ? removeUserGroupFromRoute(group.publicId)
                      : addUserGroupToRoute(group.publicId)
                  "
                  class="px-2 py-2 rounded-lg flex flex-row gap-2 items-center"
                  :class="
                    newIdentityRouteToGroupsPublicIds.includes(group.publicId)
                      ? 'bg-primary-9'
                      : 'bg-base-5'
                  ">
                  <icon
                    :name="
                      newIdentityRouteToGroupsPublicIds.includes(group.publicId)
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
          <span class="text-xs">Users</span>
          <span v-if="orgMembersPending">
            <icon name="svg-spinners:3-dots-fade" /> Loading Users
          </span>
          <div
            class="flex flex-row gap-4 flex-wrap"
            v-if="!orgMembersPending">
            <template v-for="member of orgMembersData?.members">
              <div
                class="flex flex-row gap-8 bg-base-2 p-2 rounded-xl items-center">
                <div class="flex flex-row gap-4 items-center">
                  <UnUiAvatar
                    :avatar-id="member.profile?.avatarId || ''"
                    :name="
                      member.profile?.firstName + ' ' + member.profile?.lastName
                    "
                    size="xs" />
                  <div class="flex flex-col gap-1">
                    <div class="flex flex-row gap-1 items-center h-[16px]">
                      <span class="font-semibold leading-none">
                        {{
                          member.profile?.firstName +
                          ' ' +
                          member.profile?.lastName
                        }}
                      </span>
                      <UnUiTooltip
                        text="Organization Admin"
                        class="h-[16px] w-[16px]"
                        v-if="member.role === 'admin'">
                        <icon
                          name="ph:crown"
                          class="text-yellow-8"
                          size="16" />
                      </UnUiTooltip>
                    </div>
                    <span class="leading-none">
                      @{{ member.profile?.handle }}
                    </span>
                    <span class="leading-none">
                      {{ member.profile?.title }}
                    </span>
                  </div>
                </div>
                <button
                  @click="
                    newIdentityRouteToUsersOrgMemberPublicIds.includes(
                      member.publicId
                    )
                      ? removeUserFromRoute(member.publicId)
                      : addUserToRoute(member.publicId)
                  "
                  class="px-2 py-2 rounded-lg flex flex-row gap-2 items-center"
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
          </div>
        </div>
      </div>
      <UnUiButton
        icon="ph:plus"
        :label="buttonLabel"
        :loading="buttonLoading"
        :disabled="!formValid"
        variant="soft"
        class="mt-2"
        @click="createNewEmailIdentity()" />
      <UnUiButton
        icon="ph:plus"
        :label="buttonLabel"
        :loading="buttonLoading"
        :disabled="!formValid"
        variant="outline"
        class="mt-2"
        @click="createNewEmailIdentity()" />
      <UnUiButton
        icon="ph:plus"
        :label="buttonLabel"
        :loading="buttonLoading"
        :disabled="!formValid"
        variant="solid"
        class="mt-2"
        @click="createNewEmailIdentity()" />
    </div>
  </div>
</template>
