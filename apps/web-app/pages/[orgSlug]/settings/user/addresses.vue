<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';

  const { $trpc, $i18n } = useNuxtApp();
  const { copy, copied, text } = useClipboard();
  const route = useRoute();
  const orgSlug = route.params.orgSlug as string;
  const hasAddresses = ref(false);
  const publicAddressesAvailable = ref<string[]>([]);
  const premiumAddressesAvailable = ref<string[]>([]);

  const {
    data: userAddresses,
    pending,
    error,
    refresh: refreshUserAddresses
  } = await $trpc.user.addresses.getPersonalAddresses.useLazyQuery(
    {},
    { server: false, queryKey: 'getUserAddresses' }
  );

  watch(userAddresses, (newResults) => {
    const username = userAddresses.value?.username?.toLowerCase();
    if (newResults?.identities) {
      hasAddresses.value = true;
    }
    hasAddresses.value = false;
    if (newResults?.available.public) {
      newResults.available.public.forEach((domain) => {
        publicAddressesAvailable.value.push(`${username}@${domain}`);
      });
    }
    if (newResults?.available.premium) {
      newResults.available.premium.forEach((domain) => {
        premiumAddressesAvailable.value.push(`${username}@${domain}`);
      });
    }
  });

  const preClaimModalOpen = ref(false);
  const emailIdentityToClaim = ref('');
  async function preClaim(emailIdentity: string) {
    emailIdentityToClaim.value = emailIdentity;
    preClaimModalOpen.value = true;
    // open a modal
  }
  async function claim() {
    const toast = useToast();
    toast.add({
      id: 'claiming_email',
      title: 'Setting up your new email address',
      description: `This process could take up to 30 seconds, please dont leave this page.`,
      icon: 'i-ph-clock-countdown',
      timeout: 30000
    });
    const emailIdentity = emailIdentityToClaim.value;
    // check if the email identity is in either of the available lists
    const isInPublicAvailableArray =
      publicAddressesAvailable.value.includes(emailIdentity);
    const isInPremiumAvailableArray =
      premiumAddressesAvailable.value.includes(emailIdentity);
    if (!isInPublicAvailableArray && isInPremiumAvailableArray) {
      return;
    }
    if (isInPremiumAvailableArray && !isPro.value) {
      return;
    }
    const claimResponse =
      await $trpc.user.addresses.claimPersonalAddress.mutate({
        emailIdentity: emailIdentity
      });
    toast.remove('claiming_email');
    refreshUserAddresses();
    toast.add({
      id: 'email_claimed',
      title: 'Success',
      description: `${emailIdentity} has been claimed successfully`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
    setTimeout(() => {
      preClaimModalOpen.value = false;
    }, 1000);
  }

  const isPro = ref(false);
  if (useEE().config.modules.billing) {
    const { data: isProQuery, pending } =
      await $trpc.org.setup.billing.isPro.useLazyQuery({}, { server: false });

    isPro.value = isProQuery.value?.isPro || false;
  } else {
    isPro.value = true;
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <span class="text-2xl font-display"
        >Your Personal Addresses {{ preClaimModalOpen }}</span
      >
    </div>
    <UnUiModal v-model="preClaimModalOpen">
      <template #header>
        <div class="flex flex-row items-center gap-2">
          <span class="text-red-500 text-2xl leading-none">
            <UnUiIcon
              name="i-ph-warning-octagon"
              size="xl" />
          </span>
          <span class="text-lg font-semibold leading-none"> Warning! </span>
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <span class="">
          You are about to link
          <span class="font-mono">{{ emailIdentityToClaim }}</span>
          to this organization.
        </span>
        <span class="">
          If you're removed from this organization in the future, you'll lose
          all associated conversations. Our support team may be able to reset
          the address for use in another organization.
        </span>
        <span class="">
          We suggest creating a separate organization for personal addresses.
          <nuxt-link
            class="text-gray-500 text inline-flex flex-row items-center gap-1 text-sm leading-none"
            :to="`/${orgSlug}/settings/org/new`">
            <span>Create a new organization here</span>
            <UnUiIcon
              name="i-ph-arrow-right"
              size="xs" />
          </nuxt-link>
        </span>
        <span class=""> Are you sure you want to proceed? </span>
      </div>
      <template #footer>
        <div class="flex flex-row justify-end gap-2">
          <UnUiButton
            label="Cancel"
            variant="outline"
            @click="preClaimModalOpen = false" />
          <UnUiButton
            label="Add to this organization"
            @click="preClaimModalOpen = false" />
        </div>
      </template>
    </UnUiModal>
    <div
      v-if="pending"
      class="w-full flex flex-row justify-center gap-4 rounded-xl rounded-tl-2xl bg-base-3 p-8">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading</span>
    </div>

    <div
      v-if="!pending"
      class="w-full flex flex-col items-start justify-center gap-8">
      <div
        v-if="!hasAddresses"
        class="w-full flex flex-col items-start justify-center gap-8">
        You have no personal addresses configured, claim them below.
      </div>
      <div
        v-if="
          hasAddresses &&
          (publicAddressesAvailable || premiumAddressesAvailable)
        "
        class="w-full flex flex-col items-start justify-center gap-8">
        You have unclaimed personal addresses, claim them below.
      </div>
      <div
        v-if="publicAddressesAvailable"
        class="w-full flex flex-col items-start justify-center gap-8">
        <div class="flex flex-col gap-2">
          <span class="text-sm text-base-11 font-medium uppercase">
            Free email address
          </span>
          <template
            v-for="address of publicAddressesAvailable"
            :key="address">
            <div class="flex flex-row items-center gap-2">
              <div
                class="min-w-[50px] w-fit flex flex-col items-center rounded-lg bg-base-3 px-4 py-2">
                <span class="w-fit break-anywhere text-left font-mono">
                  {{ address }}
                </span>
              </div>
              <UnUiButton
                label="Claim"
                size="md"
                @click="preClaim(address)" />
            </div>
          </template>
        </div>
      </div>
      <div
        v-if="premiumAddressesAvailable"
        class="w-full flex flex-col items-start justify-center gap-8">
        <div class="flex flex-col gap-2">
          <span class="text-sm text-base-11 font-medium uppercase">
            Premium email address
          </span>
          <template
            v-for="address of premiumAddressesAvailable"
            :key="address">
            <div class="flex flex-col gap-2">
              <div class="flex flex-row items-center gap-2">
                <div
                  class="min-w-[50px] w-fit flex flex-col items-center rounded-lg bg-base-3 px-4 py-2">
                  <span class="w-fit break-anywhere text-left font-mono">
                    {{ address }}
                  </span>
                </div>
                <UnUiButton
                  label="Claim"
                  :disabled="!isPro"
                  size="md"
                  @click="preClaim(address)" />
              </div>
              <span
                v-if="!isPro"
                class="text-sm">
                This email address is only available to claim when your
                organisation is subscribed to a plan.
              </span>
            </div>
          </template>
        </div>
      </div>
      <div
        v-if="hasAddresses"
        class="w-full flex flex-col items-start justify-center gap-8">
        <div class="flex flex-col gap-4">
          <span class="text-sm text-base-11 font-medium uppercase">
            Personal email addresses
          </span>
          <span class="text-sm">
            You can use these email addresses to send and receive emails with
            the rest of the world.
          </span>
          <span class="text-sm"
            >They are yours personally to keep forever.</span
          >
          {{ userAddresses?.identities }}
          <!-- <div
            v-for="personalEmail of userAddresses?.personalEmailAddresses"
            :key="personalEmail.username + personalEmail.domainName"
            class="flex flex-row items-center gap-2">
            <div
              class="min-w-[50px] w-fit flex flex-col items-center rounded-lg bg-base-3 p-4">
              <span class="w-fit break-anywhere text-left font-mono">
                {{ personalEmail.username }}@{{ personalEmail.domainName }}
              </span>
            </div>
            <UnUiTooltip text="Copy to clipboard">
              <UnUiIcon
                name="i-ph-clipboard"
                size="20"
                @click="
                  copy(`${personalEmail.username}@${personalEmail.domainName}`)
                " />
            </UnUiTooltip>
          </div> -->
        </div>
        <div class="flex flex-col gap-4">
          <!-- <span class="text-sm text-base-11 font-medium uppercase">
            Personal forwarding address
          </span>
          <span class="text-sm">
            Use this email address to forward in emails from another mail
            provider.
          </span>
          <span class="text-sm">
            Any emails forwarded to this address will be processed by your
            personal account.
          </span>
          <div class="flex flex-row items-center gap-2">
            <div
              class="min-w-[50px] w-fit flex flex-col items-center rounded-lg bg-base-3 p-4">
              <span class="w-fit break-anywhere text-left font-mono">
                {{ userAddresses?.personalOrgFwdAddress }}
              </span>
            </div>
            <UnUiTooltip text="Copy to clipboard">
              <UnUiIcon
                name="i-ph-clipboard"
                size="20"
                @click="copy(userAddresses?.personalOrgFwdAddress || '')" />
            </UnUiTooltip>
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>
