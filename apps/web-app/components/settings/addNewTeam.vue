<script setup lang="ts">
  import type { UiColor } from '@u22n/types/ui';
  import { z } from 'zod';
  import {
    computed,
    navigateTo,
    ref,
    storeToRefs,
    useNuxtApp,
    useRoute,
    useToast,
    watch,
    watchDebounced
  } from '#imports';
  import { useEEStore } from '~/stores/eeStore';

  const { $trpc } = useNuxtApp();
  const orgShortCode = (useRoute().params.orgShortCode ?? '') as string;

  const newTeamNameValue = ref('');
  const newTeamNameValidationMessage = ref('');
  const newTeamNameValid = ref<boolean | 'remote' | null>(null);
  const newTeamColorValue = ref<UiColor>();
  const newTeamDescriptionValue = ref('');

  const createEmailIdentityForTeam = ref(false);

  const newEmailIdentityUsernameValue = ref('');
  const newEmailIdentityUsernameValid = ref<boolean | 'remote' | null>(null);
  const newEmailIdentityUsernameValidationMessage = ref('');
  const newEmailIdentitySendNameValue = ref('');
  const newEmailIdentitySendNameValid = ref<boolean | null>(null);
  const newEmailSendNameValidationMessage = ref('');
  const newEmailIdentitySendNameTempValue = ref('');

  const buttonLabel = ref('Create New Team');
  const buttonLoading = ref(false);

  watchDebounced(
    newTeamNameValue,
    async () => {
      if (
        newEmailIdentitySendNameValue.value ===
        newEmailIdentitySendNameTempValue.value
      ) {
        const newValue = newTeamNameValue.value;
        newEmailIdentitySendNameValue.value = newValue;
        newEmailIdentitySendNameTempValue.value = newValue;
      }
    },
    {
      debounce: 500,
      maxWait: 5000
    }
  );

  interface OrgDomains {
    domainPublicId: string;
    domain: string;
  }
  const selectedDomain = ref<OrgDomains | undefined>(undefined);

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

  const formValid = computed(() => {
    const teamFormFieldsValid =
      newTeamNameValid.value === true && !!newTeamColorValue.value;
    const emailIdentityFormSendNameValid =
      newEmailIdentitySendNameValid.value === true
        ? true
        : newEmailIdentitySendNameValue.value ===
          newEmailIdentitySendNameTempValue.value;
    const emailIdentityFormFieldsValid =
      newEmailIdentityUsernameValid.value === true &&
      selectedDomain.value?.domainPublicId &&
      emailIdentityFormSendNameValid === true;

    if (createEmailIdentityForTeam.value) {
      return teamFormFieldsValid && emailIdentityFormFieldsValid;
    }
    return teamFormFieldsValid;
  });

  const emit = defineEmits(['close']);

  async function createTeam() {
    if (!newTeamColorValue.value) return;

    buttonLoading.value = true;
    buttonLabel.value = 'Creating...';
    const toast = useToast();
    const createOrgTeamsTrpc = $trpc.org.users.teams.createTeam.useMutation();
    const createOrgTeamsTrpcResponse = await createOrgTeamsTrpc.mutate({
      teamName: newTeamNameValue.value,
      teamDescription: newTeamDescriptionValue.value,
      teamColor: newTeamColorValue.value,
      orgShortCode
    });

    if (
      createOrgTeamsTrpc.status.value === 'error' ||
      !createOrgTeamsTrpcResponse?.newTeamPublicId
    ) {
      buttonLoading.value = false;
      buttonLabel.value = 'Create New Team';
      toast.add({
        id: 'team_created',
        title: 'Team Creation Failed',
        description: `${newTeamNameValue.value} team could not be created.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }
    const newTeamPublicId = createOrgTeamsTrpcResponse?.newTeamPublicId;

    if (createEmailIdentityForTeam.value) {
      const createNewEmailIdentityTrpc =
        $trpc.org.mail.emailIdentities.createNewEmailIdentity.useMutation();
      await createNewEmailIdentityTrpc.mutate({
        emailUsername: newEmailIdentityUsernameValue.value,
        domainPublicId: selectedDomain.value?.domainPublicId as string,
        sendName: newEmailIdentitySendNameValue.value,
        routeToTeamsPublicIds: [newTeamPublicId],
        routeToOrgMemberPublicIds: [],
        catchAll: false,
        orgShortCode
      });
      if (createNewEmailIdentityTrpc.status.value === 'error') {
        buttonLoading.value = false;
        buttonLabel.value = 'Create New Team';
        toast.add({
          id: 'team_created',
          title: 'Team Creation Failed',
          description: `${newTeamNameValue.value} team could not be created.`,
          icon: 'i-ph-thumbs-up',
          timeout: 5000
        });
        return;
      } else {
        toast.add({
          id: 'Email Identity Created',
          title: 'Team Created Successfully',
          description: `${newTeamNameValue.value} team with email ${newEmailIdentityUsernameValue.value}@${selectedDomain.value?.domain} created successfully.`,
          icon: 'i-ph-thumbs-up',
          timeout: 5000
        });
      }
    } else {
      toast.add({
        id: 'team_created',
        title: 'Team Created Successfully',
        description: `${newTeamNameValue.value} team has been created successfully`,
        icon: 'i-ph-thumbs-up',
        timeout: 5000
      });
    }
    buttonLoading.value = false;
    buttonLabel.value = 'Done... Redirecting';

    emit('close');
  }

  async function checkEmailAvailability() {
    if (
      newEmailIdentityUsernameValid.value === 'remote' ||
      newEmailIdentityUsernameValidationMessage.value === 'Select domain'
    ) {
      if (!selectedDomain.value?.domain) {
        newEmailIdentityUsernameValid.value = false;
        newEmailIdentityUsernameValidationMessage.value = 'Select domain';
        return;
      }
      const { available } =
        await $trpc.org.mail.emailIdentities.checkEmailAvailability.query({
          domainPublicId: selectedDomain.value?.domainPublicId as string,
          emailUsername: newEmailIdentityUsernameValue.value,
          orgShortCode
        });
      if (!available) {
        newEmailIdentityUsernameValid.value = false;
        newEmailIdentityUsernameValidationMessage.value =
          'Email already in use';
      }
      if (available) {
        newEmailIdentityUsernameValid.value = true;
        newEmailIdentityUsernameValidationMessage.value = '';
      }
      return;
    }
    return;
  }

  watchDebounced(
    newEmailIdentityUsernameValue,
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

  const eeStore = useEEStore();
  const { isPro, isProPending } = storeToRefs(eeStore);
</script>

<template>
  <div class="flex h-full w-full flex-col items-start">
    <div
      v-if="isProPending"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Checking status</span>
    </div>
    <div
      v-if="!isProPending && !isPro"
      class="flex flex-col gap-4">
      <span>
        Sorry, your current billing plan does not support adding teams.
      </span>
      <div>
        <UnUiButton
          icon="i-ph-credit-card"
          label="Go to billing"
          @click="navigateTo(`/${orgShortCode}/settings/org/setup/billing`)" />
      </div>
    </div>
    <div
      v-if="!isProPending && isPro"
      class="flex w-full flex-col gap-4">
      <div
        class="grid w-full grid-cols-1 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1">
        <UnUiInput
          v-model:value="newTeamNameValue"
          v-model:valid="newTeamNameValid"
          v-model:validationMessage="newTeamNameValidationMessage"
          label="Team Name"
          :schema="z.string().trim().min(2)"
          width="full" />
        <UnUiInput
          v-model:value="newTeamDescriptionValue"
          label="Description"
          :schema="z.string().trim().optional()"
          width="full" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm">Team Color</span>
        <div class="flex flex-row gap-2">
          <div
            class="bg-red-9 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newTeamColorValue = 'red'">
            <UnUiIcon
              v-if="newTeamColorValue === 'red'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-pink-9 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newTeamColorValue = 'pink'">
            <UnUiIcon
              v-if="newTeamColorValue === 'pink'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-purple-9 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newTeamColorValue = 'purple'">
            <UnUiIcon
              v-if="newTeamColorValue === 'purple'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-blue-9 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newTeamColorValue = 'blue'">
            <UnUiIcon
              v-if="newTeamColorValue === 'blue'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-cyan-9 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newTeamColorValue = 'cyan'">
            <UnUiIcon
              v-if="newTeamColorValue === 'cyan'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-green-9 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newTeamColorValue = 'green'">
            <UnUiIcon
              v-if="newTeamColorValue === 'green'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-orange-9 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newTeamColorValue = 'orange'">
            <UnUiIcon
              v-if="newTeamColorValue === 'orange'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-yellow-9 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newTeamColorValue = 'yellow'">
            <UnUiIcon
              v-if="newTeamColorValue === 'yellow'"
              name="i-ph-check-bold"
              size="24" />
          </div>
        </div>
      </div>
      <div
        class="grid w-full grid-cols-1 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1">
        <span class="text-sm">Add Email Address</span>
        <UnUiToggle
          v-model="createEmailIdentityForTeam"
          @click="createEmailIdentityForTeam = !createEmailIdentityForTeam" />
      </div>
      <NuxtUiDivider v-if="createEmailIdentityForTeam" />
      <div
        v-if="createEmailIdentityForTeam"
        class="flex h-full w-full flex-col items-start gap-8">
        <div class="flex w-full flex-col gap-8">
          <div class="flex w-full flex-col gap-4">
            <div
              class="items-top grid grid-cols-1 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1">
              <UnUiInput
                v-model:value="newEmailIdentityUsernameValue"
                v-model:valid="newEmailIdentityUsernameValid"
                :validation-message="newEmailIdentityUsernameValidationMessage"
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
            <UnUiInput
              v-model:value="newEmailIdentitySendNameValue"
              v-model:valid="newEmailIdentitySendNameValid"
              v-model:validationMessage="newEmailSendNameValidationMessage"
              label="Send Name"
              :schema="z.string().trim().min(2).max(64)"
              :helper="`The name that will appear in the 'From' field of emails sent from this address`" />
          </div>
        </div>
      </div>

      <UnUiButton
        icon="i-ph-plus"
        :label="buttonLabel"
        :loading="buttonLoading"
        :disabled="!formValid"
        @click="createTeam()" />
    </div>
  </div>
</template>
