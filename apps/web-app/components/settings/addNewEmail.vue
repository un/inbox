<script setup lang="ts">
  import type { UiColor } from '@uninbox/types/ui';
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();

  const newIdentityUsernameValue = ref('');
  const newIdentityUsernameValid = ref<boolean | 'remote' | null>(null);
  const newIdentityUsernameValidationMessage = ref('');
  const newIdentitySendNameValue = ref('');
  const newIdentitySendNameValid = ref<boolean | 'remote' | null>(null);
  const newIdentityCatchAll = ref(false);

  const buttonLabel = ref('Create New Email Address');
  const buttonLoading = ref(false);
  const emit = defineEmits(['close']);

  const formValid = computed(() => {
    if (isPro.value === false) {
      return (
        newIdentityUsernameValid.value === true &&
        newIdentitySendNameValid.value === true &&
        selectedDomain.value?.domainPublicId &&
        (selectedOrgGroups.value.length > 0 ||
          selectedOrgMembers.value.length > 0) &&
        !multipleDestinationsSelected.value
      );
    }
    return (
      newIdentityUsernameValid.value === true &&
      newIdentitySendNameValid.value === true &&
      selectedDomain.value?.domainPublicId &&
      (selectedOrgGroups.value.length > 0 ||
        selectedOrgMembers.value.length > 0)
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

  // get list of groups
  const { data: orgUserGroupsData, pending: orgUserGroupPending } =
    await $trpc.org.users.userGroups.getOrgUserGroups.useLazyQuery(
      {},
      { server: false }
    );
  interface OrgUserGroups {
    publicId: String;
    name: String;
    description: String | null;
    color: String | null;
  }
  const orgUserGroups = ref<OrgUserGroups[]>([]);

  watch(orgUserGroupsData, (newOrgUserGroupsData) => {
    if (newOrgUserGroupsData?.groups) {
      for (const group of newOrgUserGroupsData.groups) {
        orgUserGroups.value.push({
          publicId: group.publicId,
          name: group.name,
          description: group.description,
          color: group.color
        });
      }
    }
  });

  const selectedOrgGroups = ref<OrgUserGroups[]>([]);

  // get list of users
  const { data: orgMembersData, pending: orgMembersPending } =
    await $trpc.org.users.members.getOrgMembersList.useLazyQuery(
      {},
      { server: false }
    );
  interface OrgMembers {
    publicId: String;
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
          emailUsername: newIdentityUsernameValue.value
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

    const selectedGroupsPublicIds: string[] = selectedOrgGroups.value.map(
      (group) => group.publicId as string
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
      routeToGroupsPublicIds: selectedGroupsPublicIds,
      routeToUsersOrgMemberPublicIds: selectedOrgMembersPublicIds,
      catchAll: newIdentityCatchAll.value
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
    setTimeout(() => {
      emit('close');
    }, 1000);
  }

  const multipleDestinationsSelected = computed(() => {
    return selectedOrgGroups.value.length + selectedOrgMembers.value.length > 1;
  });

  const isPro = ref(false);
  if (useEE().config.modules.billing) {
    const { data: isProQuery } =
      await $trpc.org.setup.billing.isPro.useLazyQuery({}, { server: false });

    isPro.value = isProQuery.value?.isPro || false;
  } else {
    isPro.value = true;
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 overflow-y-scroll">
    <div class="w-full flex flex-col gap-8">
      <div class="w-full flex flex-col gap-4">
        <div class="w-full border-b-1 border-base-6">
          <span class="text-sm text-base-11 font-medium uppercase">
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

        <div class="flex flex-col gap-1">
          <span class="text-sm text-base-12 font-medium">CatchAll</span>
          <div class="flex flex-row justify-between">
            <span class="dark:text-gray-200 text-gray-700 text- text-sm">
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
        <div class="w-full border-b-1 border-base-6">
          <span class="text-sm text-base-11 font-medium uppercase">
            Deliver messages to
          </span>
        </div>

        <div
          class="grid-row-2 md:grid-row-1 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium">Groups</span>
            <span v-if="orgUserGroupPending">
              <UnUiIcon name="i-svg-spinners:3-dots-fade" /> Loading User Groups
            </span>
            <div
              v-if="!orgUserGroupPending"
              class="flex flex-row flex-wrap gap-4">
              <span v-if="orgUserGroupsData?.groups.length === 0">
                No Groups Found
              </span>
              <NuxtUiSelectMenu
                v-else
                v-model="selectedOrgGroups"
                multiple
                placeholder="Select a group"
                :options="orgUserGroups"
                class="w-full">
                <template
                  v-if="selectedOrgGroups"
                  #label>
                  <UnUiIcon
                    name="i-ph-check"
                    class="h-4 w-4" />
                  <div
                    v-if="selectedOrgGroups.length"
                    class="flex flex-wrap gap-3">
                    <div
                      v-for="(group, index) in selectedOrgGroups"
                      :key="index"
                      class="flex flex-row items-center gap-1 truncate">
                      <UnUiAvatar
                        :alt="group.name.toString()"
                        :public-id="group.publicId?.toString()"
                        :type="'group'"
                        :color="group.color as UiColor"
                        size="3xs" />
                      <span>{{ group.name }}</span>
                    </div>
                  </div>
                  <span v-else>Select groups</span>
                </template>
                <template #option="{ option }">
                  <UnUiAvatar
                    :public-id="option.publicId"
                    :type="'group'"
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
                        :alt="member.name.toString()"
                        :public-id="member.publicId?.toString()"
                        :type="'user'"
                        size="3xs" />
                      <span>{{ member.name }}</span>
                    </div>
                  </div>
                  <span v-else>Select Users</span>
                </template>
                <template #option="{ option }">
                  <UnUiAvatar
                    :public-id="option.publicId"
                    :type="'user'"
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
        class="rounded bg-red-9 p-2 text-sm text-white font-bold">
        You can only deliver messages to one single destination on your current
        plan
      </span>
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
</template>
