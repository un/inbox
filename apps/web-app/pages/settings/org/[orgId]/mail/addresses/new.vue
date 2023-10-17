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
    if (canUseMultipleDesinations.value === false) {
      return (
        newIdentityUsernameValid.value === true &&
        newIdentitySendNameValid.value === true &&
        newIdentityDomainName.value.length > 0 &&
        (newIdentityRouteToGroupsPublicIds.value.length > 0 ||
          newIdentityRouteToUsersOrgMemberPublicIds.value.length > 0) &&
        !multipleDestinationsSelected.value
      );
    }
    return (
      newIdentityUsernameValid.value === true &&
      newIdentitySendNameValid.value === true &&
      newIdentityDomainName.value.length > 0 &&
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
    await $trpc.org.users.userGroups.getOrgUserGroups.useLazyQuery({
      orgPublicId: orgPublicId
    });

  // get list of users
  const { data: orgMembersData, pending: orgMembersPending } =
    await $trpc.org.users.members.getOrgMembersList.useLazyQuery({
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

  const canUseCatchAll = ref<boolean | null | undefined>(null);
  const canUseCatchAllAllowedPlans = ref<string[]>();
  const canUseMultipleDesinations = ref<boolean | null | undefined>(null);
  const canUseMultipleDesinationsAllowedPlans = ref<string[]>();
  const multipleDestinationsSelected = computed(() => {
    return (
      newIdentityRouteToGroupsPublicIds.value.length +
        newIdentityRouteToUsersOrgMemberPublicIds.value.length >
      1
    );
  });

  if (useEE().config.modules.billing) {
    console.log('checking if can use feature');
    const { data: canUseCatch } =
      await $trpc.org.setup.billing.canUseFeature.useLazyQuery(
        {
          orgPublicId: orgPublicId,
          feature: 'userGroups'
        },
        { server: false }
      );
    const { data: canUseDestinations } =
      await $trpc.org.setup.billing.canUseFeature.useLazyQuery(
        {
          orgPublicId: orgPublicId,
          feature: 'multiDestinationEmails'
        },
        { server: false }
      );

    canUseCatchAll.value = canUseCatch.value?.canUse;
    canUseCatchAllAllowedPlans.value = canUseCatch.value?.allowedPlans;
    canUseMultipleDesinations.value = canUseDestinations.value?.canUse;
    canUseMultipleDesinationsAllowedPlans.value =
      canUseDestinations.value?.allowedPlans;
  }
</script>

<template>
  <div
    class="h-full w-full flex flex-col items-start gap-8 overflow-y-scroll p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <UnUiTooltip text="Back to Email Address list">
          <icon
            name="ph-arrow-left"
            size="32"
            @click="navigateTo('./')" />
        </UnUiTooltip>
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-display">Add a new Email Address</span>
        </div>
      </div>
    </div>

    <div class="w-full flex flex-col gap-8">
      <div class="w-full flex flex-col gap-4">
        <div class="w-full border-b-1 border-base-6">
          <span class="text-sm font-medium uppercase text-base-11">
            Email Address
          </span>
        </div>
        <UnUiInput
          v-model:value="newIdentitySendNameValue"
          v-model:valid="newIdentitySendNameValid"
          label="Send Name"
          :schema="z.string().min(2).max(64)"
          :helper="`The name that will appear in the 'From' field of emails sent from this address`" />
        <div class="flex flex-row flex-wrap items-center gap-4">
          <UnUiInput
            v-model:value="newIdentityUsernameValue"
            v-model:valid="newIdentityUsernameValid"
            label="Address"
            :schema="
              z
                .string()
                .min(1)
                .max(32)
                .regex(/^[a-zA-Z0-9]*$/, {
                  message: 'Only letters and numbers'
                })
            " />

          <div class="flex flex-col gap-1">
            <div class="flex flex-row items-end gap-2">
              <span class="text-sm font-medium text-base-12"
                >Catch-all{{ canUseCatchAll ? '' : ' (Disabled)' }}</span
              >
              <UnUiTooltip
                :text="
                  canUseCatchAll
                    ? 'If an email is sent to an address that does not exist, it will be delivered here'
                    : 'Catch-all is not available on your current billing plan'
                "
                class="max-h-[16px] leading-none">
                <icon
                  name="ph:info"
                  size="16"
                  class="max-h-[16px] max-w-[16px]" />
              </UnUiTooltip>
            </div>
            <button
              class="w-fit flex flex-row items-center gap-2 rounded-lg px-2 py-2"
              :class="
                canUseCatchAll
                  ? newIdentityCatchAll
                    ? 'bg-primary-9'
                    : 'bg-base-5'
                  : 'opacity-50 cursor-not-allowed disabled'
              "
              @click="
                canUseCatchAll
                  ? (newIdentityCatchAll = !newIdentityCatchAll)
                  : null
              ">
              <icon
                :name="newIdentityCatchAll ? 'ph:check-bold' : 'ph:x-bold'"
                size="16" />
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium text-base-12">Domain</span>
          <span v-if="orgDomainsPending">
            <icon name="svg-spinners:3-dots-fade" /> Loading Domains
          </span>
          <div
            v-if="!orgDomainsPending"
            class="flex flex-row flex-wrap gap-8">
            <span v-if="orgDomainsData?.domainData?.length === 0">
              No Domains Found
            </span>
            <div
              v-for="domain of orgDomainsData?.domainData"
              :key="domain.publicId">
              <div
                class="w-fit flex flex-row items-center gap-4 rounded-xl bg-base-2 p-1">
                <span class="font-mono">
                  {{ domain.domain }}
                </span>
                <button
                  class="flex flex-row items-center gap-2 rounded-lg px-2 py-2"
                  :class="
                    newIdentityDomainPublicId === domain.publicId
                      ? 'bg-primary-9'
                      : 'bg-base-5'
                  "
                  @click="setActiveDomain(domain.publicId)">
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
      </div>

      <div class="flex flex-col gap-4">
        <div class="w-full border-b-1 border-base-6">
          <span class="text-sm font-medium uppercase text-base-11">
            Deliver messages to
          </span>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">Groups</span>
          <span v-if="orgUserGroupPending">
            <icon name="svg-spinners:3-dots-fade" /> Loading User Groups
          </span>
          <div
            v-if="!orgUserGroupPending"
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

                    <span class="leading-none"> {{ group.description }} </span>
                  </div>
                </div>
                <button
                  class="flex flex-row items-center gap-2 rounded-lg px-2 py-2"
                  :class="
                    newIdentityRouteToGroupsPublicIds.includes(group.publicId)
                      ? 'bg-primary-9'
                      : 'bg-base-5'
                  "
                  @click="
                    newIdentityRouteToGroupsPublicIds.includes(group.publicId)
                      ? removeUserGroupFromRoute(group.publicId)
                      : addUserGroupToRoute(group.publicId)
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
          <span class="text-sm font-medium">Users</span>
          <span v-if="orgMembersPending">
            <icon name="svg-spinners:3-dots-fade" /> Loading Users
          </span>
          <div
            v-if="!orgMembersPending"
            class="flex flex-row flex-wrap gap-4">
            <template
              v-for="member of orgMembersData?.members"
              :key="member.publicId">
              <div
                class="flex flex-row items-center gap-8 rounded-xl bg-base-2 p-2">
                <div class="flex flex-row items-center gap-4">
                  <UnUiAvatar
                    :avatar-id="member.profile?.avatarId || ''"
                    :name="
                      member.profile?.firstName + ' ' + member.profile?.lastName
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
                    <span class="leading-none">
                      {{ member.profile?.title }}
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
      </div>
      <span
        v-if="!canUseMultipleDesinations && multipleDestinationsSelected"
        class="rounded bg-red-9 p-2 text-sm font-bold text-white">
        You can only deliver messages to one single destination on your current
        plan
      </span>
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
