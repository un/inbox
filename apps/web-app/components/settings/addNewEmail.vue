<script setup lang="ts">
  import type { UiColor } from '@u22n/utils';
  import { z } from 'zod';
  import {
    computed,
    ref,
    storeToRefs,
    useNuxtApp,
    useToast,
    watch,
    watchDebounced
  } from '#imports';
  import type { TypeId } from '@u22n/utils';
  import { useEEStore } from '~/stores/eeStore';
  import { useRoute } from '#vue-router';

  const { $trpc } = useNuxtApp();
  const orgShortCode = (useRoute().params.orgShortCode ?? '') as string;

  const newIdentityUsernameValue = ref('');
  const newIdentityUsernameValid = ref<boolean | 'remote' | null>(null);
  const newIdentityUsernameValidationMessage = ref('');
  const newIdentitySendNameValue = ref('');
  const newIdentitySendNameValid = ref<boolean | 'remote' | null>(null);
  const newIdentityCatchAll = ref(false);

  const buttonLabel = ref('Create New Email Address');
  const buttonLoading = ref(false);
  const emit = defineEmits(['close', 'openExternal']);

  const formValid = computed(() => {
    if (isPro.value === false) {
      return (
        newIdentityUsernameValid.value === true &&
        newIdentitySendNameValid.value === true &&
        selectedDomain.value?.domainPublicId &&
        (selectedOrgTeams.value.length > 0 ||
          selectedOrgMembers.value.length > 0) &&
        !multipleDestinationsSelected.value
      );
    }
    return (
      newIdentityUsernameValid.value === true &&
      newIdentitySendNameValid.value === true &&
      selectedDomain.value?.domainPublicId &&
      (selectedOrgTeams.value.length > 0 || selectedOrgMembers.value.length > 0)
    );
  });

  // get list of domains
  interface OrgDomains {
    domainPublicId: string;
    domain: string;
  }

  const orgDomains = ref<OrgDomains[]>([]);

  const { data: orgDomainsData, pending: orgDomainsPending } =
    await $trpc.org.mail.domains.getOrgDomains.useLazyQuery(
      { orgShortCode },
      { server: false }
    );

  watch(orgDomainsData, (newOrgDomainsData) => {
    if (newOrgDomainsData?.domainData) {
      for (const domain of newOrgDomainsData.domainData) {
        orgDomains.value.push({
          domainPublicId: domain.publicId,
          domain: domain.domain
        });
      }
    }
  });

  const selectedDomain = ref<OrgDomains | undefined>(undefined);

  // get list of teams
  const { data: orgTeamsData, pending: orgTeamPending } =
    await $trpc.org.users.teams.getOrgTeams.useLazyQuery(
      { orgShortCode },
      { server: false }
    );
  interface OrgUserTeams {
    publicId: TypeId<'teams'>;
    avatarTimestamp: Date | null;
    name: String;
    description: String | null;
    color: String | null;
  }
  const orgUserTeams = ref<OrgUserTeams[]>([]);

  watch(orgTeamsData, (newOrgUserTeamsData) => {
    if (newOrgUserTeamsData?.teams) {
      for (const team of newOrgUserTeamsData.teams) {
        orgUserTeams.value.push({
          publicId: team.publicId,
          avatarTimestamp: team.avatarTimestamp,
          name: team.name,
          description: team.description,
          color: team.color
        });
      }
    }
  });

  const selectedOrgTeams = ref<OrgUserTeams[]>([]);

  // get list of users
  const { data: orgMembersData, pending: orgMembersPending } =
    await $trpc.org.users.members.getOrgMembersList.useLazyQuery(
      { orgShortCode },
      { server: false }
    );
  interface OrgMembers {
    publicId: TypeId<'orgMembers'>;
    profilePublicId: TypeId<'orgMemberProfile'>;
    avatarTimestamp: Date | null;
    name: String;
    handle: String;
    title: String | null;
    keywords: String;
  }
  const orgMembers = ref<OrgMembers[]>([]);

  watch(orgMembersData, (newOrgMembersData) => {
    if (newOrgMembersData?.members) {
      for (const member of newOrgMembersData.members) {
        orgMembers.value.push({
          publicId: member.publicId,
          profilePublicId: member.profile?.publicId,
          avatarTimestamp: member.profile?.avatarTimestamp,
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
  });

  const selectedOrgMembers = ref<OrgMembers[]>([]);

  async function checkEmailAvailability() {
    if (
      newIdentityUsernameValid.value === 'remote' ||
      newIdentityUsernameValidationMessage.value === 'Select domain'
    ) {
      if (!selectedDomain.value?.domain) {
        newIdentityUsernameValid.value = false;
        newIdentityUsernameValidationMessage.value = 'Select domain';
        return;
      }
      const { available } =
        await $trpc.org.mail.emailIdentities.checkEmailAvailability.query({
          domainPublicId: selectedDomain.value?.domainPublicId as string,
          emailUsername: newIdentityUsernameValue.value,
          orgShortCode
        });
      if (!available) {
        newIdentityUsernameValid.value = false;
        newIdentityUsernameValidationMessage.value = 'Email already in use';
      }
      if (available) {
        newIdentityUsernameValid.value = true;
        newIdentityUsernameValidationMessage.value = '';
      }
      return;
    }
    return;
  }

  watchDebounced(
    newIdentityUsernameValue,
    async () => {
      await checkEmailAvailability();
    },
    {
      debounce: 500,
      maxWait: 5000
    }
  );
  watch(selectedDomain, () => {
    checkEmailAvailability();
  });

  async function createNewEmailIdentity() {
    buttonLoading.value = true;
    buttonLabel.value = 'Creating...';
    const toast = useToast();

    const selectedTeamsPublicIds: string[] = selectedOrgTeams.value.map(
      (team) => team.publicId as string
    );
    const selectedOrgMembersPublicIds: string[] = selectedOrgMembers.value.map(
      (member) => member.publicId as string
    );
    const createNewEmailIdentityTrpc =
      $trpc.org.mail.emailIdentities.createNewEmailIdentity.useMutation();
    await createNewEmailIdentityTrpc.mutate({
      emailUsername: newIdentityUsernameValue.value,
      domainPublicId: selectedDomain.value?.domainPublicId as string,
      sendName: newIdentitySendNameValue.value,
      routeToTeamsPublicIds: selectedTeamsPublicIds,
      routeToOrgMemberPublicIds: selectedOrgMembersPublicIds,
      catchAll: newIdentityCatchAll.value,
      orgShortCode
    });
    if (createNewEmailIdentityTrpc.status.value === 'error') {
      buttonLoading.value = false;
      buttonLabel.value = 'Create New Email Address';
      toast.add({
        id: 'email_add_fail',
        title: 'Email Creation Failed',
        description: `${newIdentityUsernameValue.value}@${selectedDomain.value?.domain} email address could not be created.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }
    buttonLoading.value = false;
    buttonLabel.value = 'Done... Redirecting';
    toast.add({
      id: 'address_added',
      title: 'Address Added',
      description: `${newIdentityUsernameValue.value}@${selectedDomain.value?.domain} has been added successfully.`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });

    emit('close');
  }

  function openExternalIdentity() {
    emit('openExternal');
    emit('close');
  }

  const multipleDestinationsSelected = computed(() => {
    return selectedOrgTeams.value.length + selectedOrgMembers.value.length > 1;
  });

  const eeStore = useEEStore();
  const { isPro } = storeToRefs(eeStore);
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 overflow-y-auto">
    <div class="flex w-full flex-col gap-8">
      <div class="flex w-full flex-col gap-4">
        <div class="border-b-1 border-base-6 w-full">
          <span class="text-base-11 text-sm font-medium uppercase">
            Email Address
          </span>
        </div>

        <div
          class="items-top grid grid-cols-1 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1">
          <UnUiInput
            v-model:value="newIdentityUsernameValue"
            v-model:valid="newIdentityUsernameValid"
            :validation-message="newIdentityUsernameValidationMessage"
            :remote-validation="true"
            label="Address"
            :schema="
              z
                .string()
                .min(1)
                .max(32)
                .regex(/^[a-zA-Z0-9._-]*$/, {
                  message: 'Only letters and numbers'
                })
            "
            width="full" />
          <div class="flex flex-col gap-1">
            <span class="text-base-12 text-sm font-medium">Domain</span>
            <span v-if="orgDomainsPending">
              <UnUiIcon name="i-svg-spinners:3-dots-fade" /> Loading Domains
            </span>
            <div v-if="!orgDomainsPending">
              <span v-if="orgDomainsData?.domainData?.length === 0">
                No Domains Found
              </span>
              <NuxtUiSelectMenu
                v-model="selectedDomain"
                searchable
                searchable-placeholder="Search a domain..."
                placeholder="Select a domain"
                :options="orgDomains"
                class="w-full">
                <template
                  v-if="selectedDomain"
                  #label>
                  <UnUiIcon
                    name="i-ph-check"
                    class="h-4 w-4" />

                  {{ selectedDomain.domain }}
                </template>
                <template #option="{ option }">
                  {{ option.domain }}
                </template>
              </NuxtUiSelectMenu>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-base-12 text-sm font-medium">CatchAll</span>
          <div class="flex flex-row justify-between">
            <span class="text- text-base-11 text-sm">
              Emails sent to unknown addresses will be delivered here
            </span>
            <UnUiTooltip
              :text="
                isPro
                  ? 'Receives all mail sent to unknown addresses'
                  : 'CatchAll is not available on your current billing plan'
              ">
              <UnUiToggle
                v-model="newIdentityCatchAll"
                :label="`Catch-all ${isPro ? '' : ' (Disabled)'}`"
                :disabled="!isPro" />
            </UnUiTooltip>
          </div>
        </div>
        <UnUiInput
          v-model:value="newIdentitySendNameValue"
          v-model:valid="newIdentitySendNameValid"
          label="Send Name"
          :schema="z.string().trim().min(2).max(64)"
          :helper="`The name that will appear in the 'From' field of emails sent from this address`" />
      </div>
      <NuxtUiDivider />
      <div class="flex flex-col gap-4">
        <div class="border-b-1 border-base-6 w-full">
          <span class="text-base-11 text-sm font-medium uppercase">
            Deliver messages to
          </span>
        </div>

        <div
          class="grid-row-2 md:grid-row-1 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium">Teams</span>
            <span v-if="orgTeamPending">
              <UnUiIcon name="i-svg-spinners:3-dots-fade" /> Loading User Teams
            </span>
            <div
              v-if="!orgTeamPending"
              class="flex flex-row flex-wrap gap-4">
              <span v-if="orgTeamsData?.teams.length === 0">
                No Teams Found
              </span>
              <NuxtUiSelectMenu
                v-else
                v-model="selectedOrgTeams"
                multiple
                placeholder="Select a team"
                :options="orgUserTeams"
                class="w-full">
                <template
                  v-if="selectedOrgTeams"
                  #label>
                  <UnUiIcon
                    name="i-ph-check"
                    class="h-4 w-4" />
                  <div
                    v-if="selectedOrgTeams.length"
                    class="flex flex-wrap gap-3">
                    <div
                      v-for="(team, index) in selectedOrgTeams"
                      :key="index"
                      class="flex flex-row items-center gap-1 truncate">
                      <UnUiAvatar
                        :alt="team.name.toString()"
                        :public-id="team.publicId"
                        :avatar-timestamp="team.avatarTimestamp"
                        :type="'team'"
                        :color="team.color as UiColor"
                        size="3xs" />
                      <span>{{ team.name }}</span>
                    </div>
                  </div>
                  <span v-else>Select teams</span>
                </template>
                <template #option="{ option }">
                  <UnUiAvatar
                    :public-id="option.publicId"
                    :avatar-timestamp="option.avatarTimestamp"
                    :type="'team'"
                    :alt="option.name"
                    :color="option.color as UiColor"
                    size="3xs" />
                  {{ option.name }}
                </template>
              </NuxtUiSelectMenu>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium">Users</span>
            <span v-if="orgMembersPending">
              <UnUiIcon name="i-svg-spinners:3-dots-fade" /> Loading Users
            </span>
            <div
              v-if="!orgMembersPending"
              class="flex flex-row flex-wrap gap-4">
              <NuxtUiSelectMenu
                v-model="selectedOrgMembers"
                multiple
                placeholder="Select users"
                :options="orgMembers"
                searchable
                option-attribute="keywords"
                class="w-full">
                <template
                  v-if="selectedOrgMembers"
                  #label>
                  <UnUiIcon
                    name="i-ph-check"
                    class="h-4 w-4" />
                  <div
                    v-if="selectedOrgMembers.length"
                    class="flex flex-wrap gap-3">
                    <div
                      v-for="(member, index) in selectedOrgMembers"
                      :key="index"
                      class="flex flex-row items-center gap-1 truncate">
                      <UnUiAvatar
                        v-if="member.publicId"
                        :public-id="member.profilePublicId"
                        :alt="member.name.toString()"
                        :avatar-timestamp="member.avatarTimestamp"
                        :type="'orgMember'"
                        size="3xs" />
                      <span>{{ member.name }}</span>
                    </div>
                  </div>
                  <span v-else>Select Users</span>
                </template>
                <template #option="{ option }">
                  <UnUiAvatar
                    :public-id="option.publicId"
                    :avatar-timestamp="option.avatarTimestamp"
                    :type="'orgMember'"
                    :alt="option.name"
                    size="xs" />
                  <span>
                    {{ option.name
                    }}<span
                      v-if="option.title"
                      class="text-xs">
                      - {{ option.title }}</span
                    ></span
                  >
                </template>
              </NuxtUiSelectMenu>
            </div>
          </div>
        </div>
      </div>
      <span
        v-if="!isPro && multipleDestinationsSelected"
        class="bg-red-9 rounded p-2 text-sm font-bold text-white">
        You can only deliver messages to one single destination on your current
        plan
      </span>
      <div class="grid grid-cols-2 gap-4">
        <UnUiButton
          icon="i-ph-link"
          label="Add external email instead"
          variant="outline"
          class="mt-2"
          @click="openExternalIdentity()" />
        <UnUiButton
          icon="i-ph-plus"
          :label="buttonLabel"
          :loading="buttonLoading"
          :disabled="!formValid"
          variant="solid"
          class="mt-2"
          @click="createNewEmailIdentity()" />
      </div>
    </div>
  </div>
</template>
