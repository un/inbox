<script setup lang="ts">
  import type { UiColor } from '@uninbox/types/ui';
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();

  const newGroupNameValue = ref('');
  const newGroupNameValidationMessage = ref('');
  const newGroupNameValid = ref<boolean | 'remote' | null>(null);
  const newGroupColorValue = ref<UiColor>();
  const newGroupDescriptionValue = ref('');

  const createEmailIdentityForGroup = ref(false);

  const newEmailIdentityUsernameValue = ref('');
  const newEmailIdentityUsernameValid = ref<boolean | 'remote' | null>(null);
  const newEmailIdentityUsernameValidationMessage = ref('');
  const newEmailIdentitySendNameValue = ref('');
  const newEmailIdentitySendNameValid = ref<boolean | null>(null);
  const newEmailIdentitySendNameValidationMessage = ref('');
  const newEmailIdentitySendNameTempValue = ref('');
  const newDomainNameValid = ref<boolean | 'remote' | null>(null);

  const buttonLabel = ref('Create New Group');
  const buttonLoading = ref(false);

  watchDebounced(
    newGroupNameValue,
    async () => {
      if (
        newEmailIdentitySendNameValue.value ===
        newEmailIdentitySendNameTempValue.value
      ) {
        const newValue = newGroupNameValue.value;
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

  const formValid = computed(() => {
    const groupFormFieldsValid =
      newGroupNameValid.value === true && !!newGroupColorValue.value;
    const emailIdentityFormSendNameValid =
      newEmailIdentitySendNameValid.value === true
        ? true
        : newEmailIdentitySendNameValue.value ===
          newEmailIdentitySendNameTempValue.value;
    const emailIdentityFormFieldsValid =
      newEmailIdentityUsernameValid.value === true &&
      selectedDomain.value?.domainPublicId &&
      emailIdentityFormSendNameValid === true;

    if (createEmailIdentityForGroup.value) {
      return groupFormFieldsValid && emailIdentityFormFieldsValid;
    }
    return groupFormFieldsValid;
  });

  const emit = defineEmits(['close']);

  const route = useRoute();

  const orgSlug = route.params.orgSlug as string;

  async function createGroup() {
    if (!newGroupColorValue.value) return;

    buttonLoading.value = true;
    buttonLabel.value = 'Creating...';
    const toast = useToast();
    const createOrgUserGroupsTrpc =
      $trpc.org.users.userGroups.createOrgUserGroups.useMutation();
    const createOrgUserGroupsTrpcResponse =
      await createOrgUserGroupsTrpc.mutate({
        groupName: newGroupNameValue.value,
        groupDescription: newGroupDescriptionValue.value,
        groupColor: newGroupColorValue.value
      });

    if (
      createOrgUserGroupsTrpc.status.value === 'error' ||
      !createOrgUserGroupsTrpcResponse?.newGroupPublicId
    ) {
      buttonLoading.value = false;
      buttonLabel.value = 'Create New Group';
      toast.add({
        id: 'group_created',
        title: 'Group Creation Failed',
        description: `${newGroupNameValue.value} group could not be created.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }
    const newGroupPublicId = createOrgUserGroupsTrpcResponse?.newGroupPublicId;

    if (createEmailIdentityForGroup.value) {
      const createNewEmailIdentityTrpc =
        $trpc.org.mail.emailIdentities.createNewEmailIdentity.useMutation();
      await createNewEmailIdentityTrpc.mutate({
        emailUsername: newEmailIdentityUsernameValue.value,
        domainPublicId: selectedDomain.value?.domainPublicId as string,
        sendName: newEmailIdentitySendNameValue.value,
        routeToGroupsPublicIds: [newGroupPublicId],
        routeToUsersOrgMemberPublicIds: [],
        catchAll: false
      });
      if (createNewEmailIdentityTrpc.status.value === 'error') {
        buttonLoading.value = false;
        buttonLabel.value = 'Create New Group';
        toast.add({
          id: 'group_created',
          title: 'Group Creation Failed',
          description: `${newGroupNameValue.value} group could not be created.`,
          icon: 'i-ph-thumbs-up',
          timeout: 5000
        });
        return;
      } else {
        toast.add({
          id: 'Email Identity Created',
          title: 'Group Created Successfully',
          description: `${newGroupNameValue.value} group with email ${newEmailIdentityUsernameValue.value}@${selectedDomain.value?.domain} created successfully.`,
          icon: 'i-ph-thumbs-up',
          timeout: 5000
        });
      }
    } else {
      toast.add({
        id: 'group_created',
        title: 'Group Created Successfully',
        description: `${newGroupNameValue.value} group has been created successfully`,
        icon: 'i-ph-thumbs-up',
        timeout: 5000
      });
    }
    buttonLoading.value = false;
    buttonLabel.value = 'Done... Redirecting';
    setTimeout(() => {
      emit('close');
    }, 1000);
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
          emailUsername: newEmailIdentityUsernameValue.value
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

  const dataPending = ref(true);

  const isPro = ref(false);
  if (useEE().config.modules.billing) {
    const { data: isProQuery, pending } =
      await $trpc.org.setup.billing.isPro.useLazyQuery({}, { server: false });

    isPro.value = isProQuery.value?.isPro || false;
    dataPending.value = pending.value;
  } else {
    dataPending.value = false;
    isPro.value = true;
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start">
    <div
      v-if="dataPending"
      class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Checking status</span>
    </div>
    <div
      v-if="!dataPending && !isPro"
      class="flex flex-col gap-4">
      <span>
        Sorry, your current billing plan does not support adding user groups.
      </span>
      <div>
        <UnUiButton
          icon="i-ph-credit-card"
          label="Go to billing"
          @click="navigateTo(`/${orgSlug}/settings/org/setup/billing`)" />
      </div>
    </div>
    <div
      v-if="!dataPending && isPro"
      class="w-full flex flex-col gap-4">
      <div
        class="grid grid-cols-1 grid-rows-2 w-full gap-4 md:grid-cols-2 md:grid-rows-1">
        <UnUiInput
          v-model:value="newGroupNameValue"
          v-model:valid="newGroupNameValid"
          v-model:validationMessage="newGroupNameValidationMessage"
          label="Group Name"
          :schema="z.string().trim().min(2)"
          width="full" />
        <UnUiInput
          v-model:value="newGroupDescriptionValue"
          label="Description"
          :schema="z.string().trim().optional()"
          width="full" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm">Group Color</span>
        <div class="flex flex-row gap-2">
          <div
            class="bg-red-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'red'">
            <UnUiIcon
              v-if="newGroupColorValue === 'red'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-pink-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'pink'">
            <UnUiIcon
              v-if="newGroupColorValue === 'pink'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-purple-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'purple'">
            <UnUiIcon
              v-if="newGroupColorValue === 'purple'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-blue-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'blue'">
            <UnUiIcon
              v-if="newGroupColorValue === 'blue'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-cyan-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'cyan'">
            <UnUiIcon
              v-if="newGroupColorValue === 'cyan'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-green-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'green'">
            <UnUiIcon
              v-if="newGroupColorValue === 'green'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-orange-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'orange'">
            <UnUiIcon
              v-if="newGroupColorValue === 'orange'"
              name="i-ph-check-bold"
              size="24" />
          </div>
          <div
            class="bg-yellow-500 h-8 w-8 cursor-pointer rounded p-2 text-white"
            @click="newGroupColorValue = 'yellow'">
            <UnUiIcon
              v-if="newGroupColorValue === 'yellow'"
              name="i-ph-check-bold"
              size="24" />
          </div>
        </div>
      </div>
      <div
        class="grid grid-cols-1 grid-rows-2 w-full gap-4 md:grid-cols-2 md:grid-rows-1">
        <span class="text-sm">Add Email Address</span>
        <UnUiToggle
          v-model="createEmailIdentityForGroup"
          @click="createEmailIdentityForGroup = !createEmailIdentityForGroup" />
      </div>
      <NuxtUiDivider v-if="createEmailIdentityForGroup" />
      <div
        v-if="createEmailIdentityForGroup"
        class="h-full w-full flex flex-col items-start gap-8">
        <div class="w-full flex flex-col gap-8">
          <div class="w-full flex flex-col gap-4">
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
                    .regex(/^[a-zA-Z0-9]*$/, {
                      message: 'Only letters and numbers'
                    })
                "
                width="full" />
              <div class="flex flex-col gap-1">
                <span class="text-sm text-base-12 font-medium">Domain</span>
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
              v-model:validationMessage="
                newEmailIdentitySendNameValidationMessage
              "
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
        @click="createGroup()" />
    </div>
  </div>
</template>
