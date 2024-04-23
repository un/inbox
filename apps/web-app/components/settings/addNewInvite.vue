<script setup lang="ts">
  import {
    computed,
    ref,
    useNuxtApp,
    useToast,
    watch,
    watchDebounced
  } from '#imports';
  import type { UiColor } from '@u22n/types/ui';
  import type { TypeId } from '@u22n/utils';
  import { z } from 'zod';

  const { $trpc } = useNuxtApp();

  const newInviteUserFnameValue = ref('');
  const newInviteUserFnameValid = ref<boolean | 'remote' | null>(null);
  const newInviteUserLnameValue = ref('');
  const newInviteUserLnameValid = ref<boolean | 'remote' | null>(null);
  const newInviteUserTitleValue = ref('');
  const newInviteUserTitleValid = ref<boolean | 'remote' | null>(null);
  const newInviteUserEmailAddressValue = ref('');
  const newInviteUserEmailAddressValid = ref<boolean | 'remote' | null>(null);
  const newInviteEmailUsernameValue = ref('');
  const newInviteEmailUsernameValid = ref<boolean | 'remote' | null>(null);
  const newInviteEmailUsernameValidationMessage = ref('');
  const newInviteEmailSendNameValue = ref('');
  const newInviteEmailSendNameValid = ref<boolean | 'remote' | null>(null);

  const memberRoles = [
    {
      label: 'Admin',
      value: 'admin',
      icon: 'i-ph-crown'
    },
    {
      label: 'Member',
      vale: 'member',
      icon: 'i-ph-user'
    }
  ];

  const selectedMemberRole = ref(memberRoles[1]);

  const computedFullName = computed(() => {
    return `${newInviteUserFnameValue.value} ${newInviteUserLnameValue.value}`;
  });
  const dummyNewInviteEmailSendNameValue = ref('');

  watch(computedFullName, (newName) => {
    if (
      newInviteEmailSendNameValue.value ===
      dummyNewInviteEmailSendNameValue.value
    ) {
      newInviteEmailSendNameValue.value = newName;
      newInviteEmailSendNameValid.value = true;
      dummyNewInviteEmailSendNameValue.value = newName;
    }
  });

  const sendEmailNotification = ref(false);
  const createEmailIdentity = ref(false);
  const addUserToTeams = ref(false);

  const buttonLabel = ref('Create New Invite');
  const buttonLoading = ref(false);
  const emit = defineEmits(['close', 'refresh']);

  const formValid = computed(() => {
    return (
      newInviteUserFnameValid.value === true &&
      (sendEmailNotification.value === true
        ? newInviteUserEmailAddressValid.value === true
        : true) &&
      (createEmailIdentity.value === true
        ? newInviteEmailUsernameValid.value === true &&
          newInviteEmailSendNameValid.value === true
        : true) &&
      (addUserToTeams.value === true ? selectedOrgTeams.value.length > 0 : true)
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
      {},
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

  async function checkEmailAvailability() {
    if (
      newInviteEmailUsernameValid.value === 'remote' ||
      newInviteEmailUsernameValidationMessage.value === 'Select domain'
    ) {
      if (!selectedDomain.value?.domain) {
        newInviteEmailUsernameValid.value = false;
        newInviteEmailUsernameValidationMessage.value = 'Select domain';
        return;
      }
      const { available } =
        await $trpc.org.mail.emailIdentities.checkEmailAvailability.query({
          domainPublicId: selectedDomain.value?.domainPublicId as string,
          emailUsername: newInviteEmailUsernameValue.value
        });
      if (!available) {
        newInviteEmailUsernameValid.value = false;
        newInviteEmailUsernameValidationMessage.value = 'Email already in use';
      }
      if (available) {
        newInviteEmailUsernameValid.value = true;
        newInviteEmailUsernameValidationMessage.value = '';
      }
      return;
    }
    return;
  }

  watchDebounced(
    newInviteEmailUsernameValue,
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

  // get list of teams
  const { data: orgTeamsData } =
    await $trpc.org.users.teams.getOrgTeams.useLazyQuery({}, { server: false });
  interface OrgUserTeams {
    publicId: TypeId<'teams'>;
    avatarTimestamp: Date | null;
    name: String;
    description: String | null;
    color: String | null;
  }
  const orgUserTeams = ref<OrgUserTeams[]>([]);

  watch(orgTeamsData, (newOrgTeamsData) => {
    if (newOrgTeamsData?.teams) {
      for (const team of newOrgTeamsData.teams) {
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

  async function createInvite() {
    const toast = useToast();
    toast.add({
      id: 'creating_invite',
      title: 'Creating Invite',
      description: `This could take up to 30 seconds to complete.`,
      icon: 'i-ph-clock',
      color: 'yellow',
      timeout: 30000
    });

    const newOrgMember = {
      firstName: newInviteUserFnameValue.value,
      ...(newInviteUserLnameValue.value && {
        lastName: newInviteUserLnameValue.value
      }),
      ...(newInviteUserTitleValue.value && {
        title: newInviteUserTitleValue.value
      }),
      role: (selectedMemberRole.value?.value as 'admin' | 'member') || 'member'
    };

    const sendNotification = sendEmailNotification.value
      ? {
          notificationEmailAddress: newInviteUserEmailAddressValue.value
        }
      : undefined;

    const createEmail = createEmailIdentity.value
      ? {
          emailUsername: newInviteEmailUsernameValue.value,
          domainPublicId: selectedDomain.value?.domainPublicId as string,
          sendName: newInviteEmailSendNameValue.value
        }
      : undefined;

    const addToTeams = addUserToTeams.value
      ? {
          teamsPublicIds: selectedOrgTeams.value.map(
            (team) => team.publicId as string
          )
        }
      : undefined;

    buttonLoading.value = true;
    buttonLabel.value = 'Creating invite...';
    const createNewInviteTrpc =
      $trpc.org.users.invites.createNewInvite.useMutation();
    await createNewInviteTrpc.mutate({
      newOrgMember: newOrgMember,
      notification: sendEmailNotification.value ? sendNotification : undefined,
      email: createEmailIdentity.value ? createEmail : undefined,
      teams: addUserToTeams.value ? addToTeams : undefined
    });

    if (createNewInviteTrpc.status.value === 'error') {
      buttonLoading.value = false;
      buttonLabel.value = 'Create Invite';
      toast.add({
        id: 'invite_add_fail',
        title: 'Invite Creation Failed',
        description: `The invite could not be created.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }

    buttonLoading.value = false;
    buttonLabel.value = 'All done';
    toast.remove('creating_invite');
    toast.add({
      id: 'invite_created',
      title: 'Invite Created',
      description: `New Invite has been created successfully.`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });

    emit('refresh');
    emit('close');
  }
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-4 overflow-y-auto">
    <div class="flex w-full flex-col gap-2">
      <div
        class="grid grid-cols-1 grid-rows-2 gap-2 md:grid-cols-2 md:grid-rows-1 md:gap-4">
        <UnUiInput
          v-model:value="newInviteUserFnameValue"
          v-model:valid="newInviteUserFnameValid"
          label="First name"
          :schema="z.string().trim().min(1).max(32)"
          width="full" />
        <UnUiInput
          v-model:value="newInviteUserLnameValue"
          v-model:valid="newInviteUserLnameValid"
          label="Last name (Optional)"
          :schema="z.string().trim().min(1).max(32)"
          width="full" />
      </div>
      <div
        class="grid grid-cols-1 grid-rows-2 gap-2 md:grid-cols-2 md:grid-rows-1 md:gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-base-12 text-sm font-medium">Role</span>
          <NuxtUiSelectMenu
            v-model="selectedMemberRole"
            :options="memberRoles"
            class="w-full">
            <template
              v-if="selectedMemberRole"
              #label>
              <UnUiIcon
                :name="selectedMemberRole.icon"
                class="h-4 w-4"
                :class="
                  selectedMemberRole.value === 'admin' ? 'text-yellow-9' : ''
                " />

              {{ selectedMemberRole.label }}
            </template>
            <template #option="{ option }">
              <UnUiIcon
                :name="option.icon"
                class="h-4 w-4"
                :class="option.value === 'admin' ? 'text-yellow-9' : ''" />
              {{ option.label }}
            </template>
          </NuxtUiSelectMenu>
        </div>
        <UnUiInput
          v-model:value="newInviteUserTitleValue"
          v-model:valid="newInviteUserTitleValid"
          label="Title (Optional)"
          :schema="z.string().trim().min(1).max(32)"
          width="full" />
      </div>
    </div>
    <NuxtUiDivider />
    <div class="flex w-full flex-col gap-2">
      <div class="items-top flex w-full flex-row justify-between gap-1">
        <div>
          <span class="text-base-12 text-sm font-medium"
            >Send invitation notification</span
          >
          <div
            v-if="!sendEmailNotification"
            class="flex w-full flex-col justify-between gap-0">
            <span class="text- text-base-11 text-sm">
              Send an invitation to join this organization via email
            </span>
            <span class="text- text-base-11 text-sm">
              Otherwise you can send the invite code manually
            </span>
          </div>
        </div>
        <UnUiToggle
          v-model="sendEmailNotification"
          label="Send notification" />
      </div>

      <UnUiInput
        v-if="sendEmailNotification"
        v-model:value="newInviteUserEmailAddressValue"
        v-model:valid="newInviteUserEmailAddressValid"
        label="Notification Email Address"
        :schema="z.string().trim().email()"
        width="full" />
    </div>

    <NuxtUiDivider />
    <div class="flex w-full flex-col gap-2">
      <div class="items-top flex w-full flex-row justify-between gap-1">
        <div>
          <span class="text-base-12 text-sm font-medium"
            >Create email address</span
          >
          <div class="flex w-full flex-row justify-between gap-8">
            <span
              v-if="!createEmailIdentity"
              class="text- text-base-11 text-sm">
              Create an email identity for this user
            </span>
            <div class="flex flex-col gap-1"></div>
          </div>
        </div>
        <UnUiToggle
          v-model="createEmailIdentity"
          label="Create email" />
      </div>
      <div
        v-if="createEmailIdentity"
        class="items-top grid grid-cols-1 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1">
        <UnUiInput
          v-model:value="newInviteEmailUsernameValue"
          v-model:valid="newInviteEmailUsernameValid"
          :validation-message="newInviteEmailUsernameValidationMessage"
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
              v-if="
                orgDomainsData?.domainData?.length
                  ? orgDomainsData?.domainData?.length > 0
                  : false
              "
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
        <UnUiInput
          v-model:value="newInviteEmailSendNameValue"
          v-model:valid="newInviteEmailSendNameValid"
          label="Send Name"
          locked
          editable
          width="full"
          :schema="z.string().trim().min(2).max(64)"
          :helper="`The name that will appear in the 'From' field of emails sent from this user`" />
      </div>
    </div>
    <NuxtUiDivider />
    <div class="flex w-full flex-col gap-2">
      <div class="items-top flex w-full flex-row justify-between gap-1">
        <div>
          <span class="text-base-12 text-sm font-medium"
            >Add user to teams</span
          >
          <div class="flex w-full flex-row justify-between gap-8">
            <span
              v-if="!addUserToTeams"
              class="text- text-base-11 text-sm">
              Give them access to existing team conversations and email
              identities
            </span>
            <div class="flex flex-col gap-1"></div>
          </div>
        </div>
        <UnUiToggle
          v-model="addUserToTeams"
          label="Add user to team" />
      </div>
      <div v-if="addUserToTeams">
        <span v-if="orgTeamsData?.teams.length === 0"> No Teams Found </span>
        <NuxtUiSelectMenu
          v-else
          v-model="selectedOrgTeams"
          multiple
          placeholder="Select a team"
          :options="orgUserTeams"
          class="mr-3">
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
              :color="option.color.toString()"
              size="3xs" />
            {{ option.name }}
          </template>
        </NuxtUiSelectMenu>
      </div>
    </div>
    <UnUiButton
      icon="i-ph-plus"
      :label="buttonLabel"
      :loading="buttonLoading"
      :disabled="!formValid"
      block
      variant="solid"
      class="mt-2"
      @click="createInvite()" />
  </div>
</template>
