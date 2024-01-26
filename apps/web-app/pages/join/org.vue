<script setup lang="ts">
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();

  const newButtonLoading = ref(false);
  const newButtonLabel = ref('Make my organization');
  const joinButtonLoading = ref(false);
  const joinButtonLabel = ref('Join my team');
  const pageError = ref(false);
  const orgPath = ref<'join' | 'new' | null>();

  //Form Fields
  const inviteCodePrefilled = ref(false);
  const inviteCodeValid = ref<boolean | 'remote' | null>(null);
  const inviteCodeValue = ref('');
  const inviteCodeValidationMessage = ref('');
  const orgNameValid = ref<boolean | 'remote' | null>(null);
  const orgNameValue = ref('');
  const orgNameValidationMessage = ref('');
  const orgSlugValid = ref<boolean | 'remote' | null>(null);
  const orgSlugValue = ref('');
  const orgSlugTempValue = ref('');
  const orgSlugValidationMessage = ref('');
  const alsoCreatePersonalOrg = ref(false);

  watchDebounced(
    orgNameValue,
    async () => {
      if (orgSlugTempValue.value === orgSlugValue.value) {
        const newValue = orgNameValue.value
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        orgSlugValue.value = newValue;
        orgSlugTempValue.value = newValue;
      }
    },
    {
      debounce: 500,
      maxWait: 5000
    }
  );

  watchDebounced(
    orgSlugValue,
    async () => {
      if (orgSlugValid.value === 'remote') {
        const { available, error } =
          await $trpc.org.crud.checkSlugAvailability.query({
            slug: orgSlugValue.value
          });
        if (!available) {
          orgSlugValid.value = false;
          orgSlugValidationMessage.value = 'Not available';
        }
        available && (orgSlugValid.value = true);
      }
    },
    {
      debounce: 500,
      maxWait: 5000
    }
  );

  if (process.client) {
    const inviteCodeCookie = useCookie('un-invite-code').value;
    if (inviteCodeCookie) {
      inviteCodePrefilled.value = true;
      inviteCodeValid.value = true;
      inviteCodeValue.value = inviteCodeCookie;
    }
  }
  const formValid = computed(() => {
    if (orgPath.value === 'join' && inviteCodeValid.value === true) return true;
    if (
      orgPath.value === 'new' &&
      (orgNameValid.value && orgSlugValid.value) === true
    )
      return true;
  });

  const toast = useToast();
  //functions
  async function createNewOrg() {
    newButtonLoading.value = true;

    newButtonLabel.value = 'Creating your organization';
    toast.add({
      id: 'creating_org',
      title: 'Creating your organization',
      description: `This may take a few seconds`,
      icon: 'i-ph-clock-clockwise',
      timeout: 20000
    });
    const createNewOrgTrpc = $trpc.org.crud.createNewOrg.useMutation();
    await createNewOrgTrpc.mutate({
      orgName: orgNameValue.value,
      orgSlug: orgSlugValue.value
    });
    if (createNewOrgTrpc.status.value === 'error') {
      newButtonLoading.value = false;
      newButtonLabel.value = 'Make my organization';
      toast.add({
        id: 'create_new_org_fail',
        title: 'Could not create organization',
        description: `Check the errors and try again.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }

    const orgSlugCookie = useCookie('un-join-org-slug', {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    orgSlugCookie.value = orgSlugValue.value as string;
    toast.remove('creating_org');
    toast.add({
      id: 'created_org',
      title: 'Organization created',
      description: `🎉`,
      icon: 'i-ph-check',
      timeout: 5000
    });
    newButtonLoading.value = false;
    newButtonLabel.value = 'All Done!';
    navigateTo('/join/profile');
  }
  async function joinOrg() {
    joinButtonLoading.value = true;
    joinButtonLabel.value = 'Joining the organization';
    const redeemInviteTrpc = $trpc.org.users.invites.redeemInvite.useMutation();
    const joinOrgResponse = await redeemInviteTrpc.mutate({
      inviteToken: inviteCodeValue.value
    });
    if (redeemInviteTrpc.status.value === 'error') {
      joinButtonLoading.value = false;
      joinButtonLabel.value = 'Join my team';
      toast.add({
        id: 'redeem_invite_fail',
        title: 'Could not join organization',
        description: `Check the errors and try again.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }
    const orgSlugCookie = useCookie('un-join-org-slug', {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    orgSlugCookie.value = joinOrgResponse!.orgSlug as string;
    toast.add({
      id: 'joined_org',
      title: 'Organization joined',
      description: `🎉`,
      icon: 'i-ph-check',
      timeout: 5000
    });
    joinButtonLoading.value = false;
    joinButtonLabel.value = 'All Done!';
    navigateTo('/join/profile');
  }
</script>

<template>
  <div class="h-screen w-screen flex flex-col items-center justify-between p-4">
    <div
      class="max-w-72 w-full flex grow flex-col items-center justify-center gap-8 pb-14 md:max-w-xl">
      <h1 class="mb-4 text-center text-2xl font-display">
        Let's make your <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <h2 class="text-center text-xl font-semibold">
        Set up your organization
      </h2>
      <div class="w-full flex flex-row justify-stretch gap-2">
        <UnUiTooltip
          text="Choose your username"
          class="w-full">
          <div
            class="bg-primary-400 h-2 w-full rounded"
            @click="navigateTo('/join')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Secure your account"
          class="w-full">
          <div
            class="bg-primary-400 h-2 w-full rounded"
            @click="navigateTo('/join/passkey')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Set up your organization"
          class="w-full">
          <div
            class="bg-primary-600 h-2 w-full rounded"
            @click="navigateTo('/join/org')" />
        </UnUiTooltip>
        <UnUiTooltip
          text="Create your profile"
          class="w-full">
          <div
            class="bg-primary-400 h-2 w-full rounded"
            @click="navigateTo('/join/profile')" />
        </UnUiTooltip>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-center">
          With an organization you can share conversations, notes and email
          identities between members and groups.
        </p>
        <p class="text-center text-sm">
          Tip: You can be a member of multiple organizations.
        </p>
      </div>

      <UnUiButtonGroup
        size="md"
        orientation="horizontal"
        class="w-full">
        <UnUiButton
          label="Create new organization"
          icon="i-ph-plus"
          :disabled="orgPath === 'new'"
          class="grow justify-center"
          @click="orgPath = 'new'" />
        <UnUiButton
          label="Join existing organization"
          icon="i-ph-users-three"
          :disabled="orgPath === 'join'"
          class="grow justify-center"
          @click="orgPath = 'join'" />
      </UnUiButtonGroup>

      <div
        v-if="orgPath === 'new'"
        class="w-full flex flex-col gap-4">
        <UnUiInput
          v-model:value="orgNameValue"
          v-model:valid="orgNameValid"
          v-model:validationMessage="orgNameValidationMessage"
          width="full"
          label="Organization Name"
          placeholder=""
          :schema="z.string().trim()" />
        <UnUiInput
          v-model:value="orgSlugValue"
          v-model:valid="orgSlugValid"
          v-model:validationMessage="orgSlugValidationMessage"
          width="full"
          locked
          remote-validation
          label="Organization Slug"
          placeholder=""
          :schema="
            z
              .string()
              .min(5)
              .max(64)
              .regex(/^[a-z0-9]*$/, {
                message: 'Only letters and numbers'
              })
          " />

        <UnUiButton
          :label="newButtonLabel"
          icon="i-ph-house"
          :loading="newButtonLoading"
          :disabled="!formValid"
          block
          @click="createNewOrg()" />
      </div>
      <div
        v-if="orgPath === 'join'"
        class="w-full flex flex-col gap-8">
        <div class="flex flex-col gap-2">
          <UnUiInput
            v-model:value="inviteCodeValue"
            v-model:valid="inviteCodeValid"
            v-model:validationMessage="inviteCodeValidationMessage"
            width="full"
            label="Invite Code"
            placeholder=""
            :schema="z.string().trim().min(10).max(32)" />
          <p
            v-if="inviteCodePrefilled"
            class="text-sm">
            We detected your invite code, you're good to go
          </p>
        </div>

        <UnUiButton
          :label="joinButtonLabel"
          icon="i-ph-users-four"
          :loading="joinButtonLoading"
          :disabled="!formValid"
          block
          @click="joinOrg()" />
      </div>
      <UnUiAlert
        v-if="pageError"
        title="Uh oh!"
        color="red"
        icon="i-ph-warning-circle"
        description="Something went wrong, please try again or contact our support team if it
        persists" />
    </div>
  </div>
</template>
