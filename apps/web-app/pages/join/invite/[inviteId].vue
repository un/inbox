<script setup lang="ts">
  definePageMeta({ guest: true });
  const { $trpc, $i18n } = useNuxtApp();

  const turnstile = ref();
  const turnstileToken = ref();
  const inviteId = useRoute().params.inviteId;
  const joinButtonLoading = ref(false);
  const joinButtonLabel = ref('Join organization');
  const turnstileEnabled = useRuntimeConfig().public.turnstileEnabled;
  if (!turnstileEnabled) {
    turnstileToken.value = '';
  }

  const queryVariables = ref({
    turnstileToken: turnstileToken.value,
    inviteToken: inviteId as string
  });
  const {
    data: inviteQuery,
    error,
    execute,
    status
  } = await $trpc.org.users.invites.validateInvite.useLazyQuery(
    queryVariables.value,
    { server: false, immediate: false }
  );
  watch(turnstileToken, () => {
    if (!turnstileToken.value) return;

    if (status.value === 'success') return;
    queryVariables.value.turnstileToken = turnstileToken.value;
    execute();
  });

  const inviteCookie = useCookie('un-invite-code', {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  inviteCookie.value = inviteId as string;

  async function joinOrg() {
    const toast = useToast();
    joinButtonLoading.value = true;
    joinButtonLabel.value = 'Joining the organization';
    const redeemInviteTrpc = $trpc.org.users.invites.redeemInvite.useMutation();
    const joinOrgResponse = await redeemInviteTrpc.mutate({
      inviteToken: inviteId as string
    });
    if (redeemInviteTrpc.status.value === 'error') {
      joinButtonLoading.value = false;
      joinButtonLabel.value = 'Join organization';
      toast.add({
        id: 'redeem_invite_fail',
        title: 'Could not redeem the invite',
        description: `Something went wrong.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }
    const orgSlugCookie = useCookie('un-org-slug', {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    orgSlugCookie.value = joinOrgResponse!.orgSlug as string;

    joinButtonLoading.value = false;
    joinButtonLabel.value = 'All Done!';
    toast.add({
      id: 'org_joined',
      title: 'Success',
      description: `You have been added to the ${inviteQuery.value?.orgName} organization.`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
    setTimeout(() => {
      navigateTo(`/${inviteQuery.value?.orgSlug}`);
    }, 1000);
  }
</script>

<template>
  <div
    class="h-screen w-screen flex flex-col items-center justify-between p-4 pb-14">
    <div
      class="max-w-72 w-full flex grow flex-col items-center justify-center gap-8 pb-4 md:max-w-xl">
      <h1 class="mb-4 text-center text-2xl font-display">
        Welcome to <br /><span class="text-5xl">UnInbox</span>
      </h1>
      <div
        v-if="status === 'pending' || status === 'idle'"
        class="flex flex-col items-center gap-8">
        <div class="flex flex-row gap-4">
          <UnUiIcon
            name="i-ph-spinner-gap"
            class="h-8 w-8 animate-spin" />
          <h2 class="text-center text-lg font-semibold">
            Checking your invite
          </h2>
        </div>
        <div class="flex flex-col gap-2">
          <UnUiSkeleton class="h-20 w-20 rounded-full" />
          <UnUiSkeleton class="h-7 w-20" />
        </div>
      </div>
      <div
        v-if="status === 'error'"
        class="w-full flex flex-col items-center gap-8">
        <UnUiAlert
          icon="i-ph-warning-octagon"
          class="w-full"
          title="Something went wrong"
          :description="
            error?.message || 'Something went wrong. Please try again later.'
          "
          color="red" />
      </div>
      <div
        v-if="status === 'success'"
        class="flex flex-col items-center gap-8">
        <h2 class="text-center text-lg font-semibold">
          You're invited to join
        </h2>
        <div class="flex flex-col items-center gap-2">
          <UnUiAvatar
            :public-id="inviteQuery?.orgPublicId || ''"
            :type="'org'"
            :alt="inviteQuery?.orgName"
            size="3xl" />
          <p class="text-center text-xl font-display">
            {{ inviteQuery?.orgName }}
          </p>
        </div>
      </div>

      <div class="mt-3 w-full">
        <UnUiSkeleton
          v-if="status !== 'success'"
          class="h-8 w-full rounded-md" />
        <UnUiButton
          v-if="status === 'success' && !inviteQuery?.loggedIn"
          label="Create Account"
          icon="i-ph-plus"
          block
          @click="navigateTo('/join')" />
        <UnUiButton
          v-if="status === 'success' && inviteQuery?.loggedIn"
          :loading="joinButtonLoading"
          :label="joinButtonLabel"
          icon="i-ph-users-three"
          block
          @click="joinOrg()" />
      </div>

      <NuxtTurnstile
        v-if="turnstileEnabled"
        ref="turnstile"
        v-model="turnstileToken"
        class="fixed bottom-5 mb-[-30px] scale-50 hover:(mb-0 scale-100)" />
    </div>
  </div>
</template>
