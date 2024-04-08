<script setup lang="ts">
  import { z } from 'zod';
  import {
    useNuxtApp,
    useToast,
    ref,
    watch,
    useRoute,
    storeToRefs,
    navigateTo
  } from '#imports';
  import { useEEStore } from '~/stores/eeStore';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg

  const { $trpc } = useNuxtApp();
  const route = useRoute();
  const orgShortcode = route.params.orgShortcode as string;
  const hasAddresses = ref(false);
  const publicAddressesAvailable = ref<string[]>([]);
  const premiumAddressesAvailable = ref<string[]>([]);

  const tableColumns = [
    {
      key: 'address',
      label: 'Address'
    },
    {
      key: 'sendName',
      label: 'Send Name'
    },
    {
      key: 'forwarding',
      label: 'Forwarding Address'
    },
    {
      key: 'org',
      label: 'Assigned to'
    }
  ];

  const tableRows = ref<{}[]>([]);

  const {
    data: accountAddresses,
    pending,
    refresh: refreshAccountAddresses
  } = await $trpc.account.addresses.getPersonalAddresses.useLazyQuery(
    {},
    { server: false, queryKey: 'getAccountAddresses' }
  );

  watch(accountAddresses, (newResults) => {
    const username = accountAddresses.value?.username?.toLowerCase();
    if (newResults?.identities.length) {
      hasAddresses.value = true;
      tableRows.value = [];
      newResults.identities.forEach((identity) => {
        const truncatedForwarding = 'forwardingAddress';
        tableRows.value.push({
          address: `${identity.emailIdentity.username}@${identity.emailIdentity.domainName}`,
          sendName: identity.emailIdentity.sendName,
          forwarding: {
            truncated: truncatedForwarding,
            address: 'forwardingAddress'
          },
          org: identity.org,
          avatarTimestamp: identity.org.avatarTimestamp,
          publicId: identity.emailIdentity.publicId
        });
      });
    }
    if (!newResults?.identities.length) {
      hasAddresses.value = false;
    }
    if (newResults?.available.free) {
      publicAddressesAvailable.value = [];
      newResults.available.free.forEach((domain) => {
        publicAddressesAvailable.value.push(`${username}@${domain}`);
      });
    }
    if (newResults?.available.premium) {
      premiumAddressesAvailable.value = [];
      newResults.available.premium.forEach((domain) => {
        premiumAddressesAvailable.value.push(`${username}@${domain}`);
      });
    }
  });

  const editSendNameModalOpen = ref(false);
  const emailIdentityPublicIdToEdit = ref('');
  const editedSendName = ref('');
  const editedSendNameValid = ref(false);
  async function preEdit(publicId: string, sendName: string) {
    emailIdentityPublicIdToEdit.value = publicId;
    editedSendName.value = sendName;
    editSendNameModalOpen.value = true;
    // open a modal
  }

  async function editSendName() {
    const toast = useToast();
    toast.add({
      id: 'editing_send_name',
      title: 'Editing your send name',
      icon: 'i-ph-clock-countdown',
      timeout: 5000
    });
    const emailIdentityPublicId = emailIdentityPublicIdToEdit.value;
    const sendName = editedSendName.value;
    const editSendNameTrpc = $trpc.account.addresses.editSendName.useMutation();
    await editSendNameTrpc.mutate({
      emailIdentityPublicId: emailIdentityPublicId,
      newSendName: sendName
    });
    if (editSendNameTrpc.status.value === 'error') {
      toast.remove('editing_send_name');
      toast.add({
        id: 'send_name_edit_fail',
        title: 'Something went wrong',
        description: `${emailIdentityPublicId} cant be edited. Refresh the page and try again.`,
        icon: 'i-ph-warning-octagon',
        timeout: 5000
      });
      return;
    }
    toast.remove('editing_send_name');
    refreshAccountAddresses();
    toast.add({
      id: 'send_name_edited',
      title: 'Success',
      description: `Send name has been edited successfully`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
    setTimeout(() => {
      editSendNameModalOpen.value = false;
    }, 1000);
  }

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
      description: `Hold on.`,
      icon: 'i-ph-clock-countdown',
      timeout: 10000
    });
    const emailIdentity = emailIdentityToClaim.value;
    // check if the email identity is in either of the available lists
    const isInPublicAvailableArray =
      publicAddressesAvailable.value.includes(emailIdentity);
    const isInPremiumAvailableArray =
      premiumAddressesAvailable.value.includes(emailIdentity);
    if (!isInPublicAvailableArray && !isInPremiumAvailableArray) {
      toast.remove('claiming_email');
      toast.add({
        id: 'email_claim_fail',
        title: 'Something went wrong',
        description: `${emailIdentity} cant be claimed. Refresh the page and try again.`,
        icon: 'i-ph-warning-octagon',
        timeout: 5000
      });
      return;
    }
    if (isInPremiumAvailableArray && !isPro.value) {
      return;
    }
    const claimPersonalAddressTrpc =
      $trpc.account.addresses.claimPersonalAddress.useMutation();
    await claimPersonalAddressTrpc.mutate({
      emailIdentity: emailIdentity
    });
    if (claimPersonalAddressTrpc.status.value === 'error') {
      toast.remove('claiming_email');
      toast.add({
        id: 'claim_email_fail',
        title: 'Failed to claim email',
        description: `${emailIdentity} could not be claimed. Refresh the page and try again.`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }
    toast.remove('claiming_email');
    refreshAccountAddresses();
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

  const eeStore = useEEStore();
  const { isPro } = storeToRefs(eeStore);
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row gap-2">
        <UnUiButton
          v-if="isMobile"
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="navigateTo(`/${orgShortcode}/settings`)" />
        <span class="font-display text-2xl"> Your Personal Addresses </span>
      </div>
    </div>
    <UnUiModal v-model="preClaimModalOpen">
      <template #header>
        <div class="flex flex-row items-center gap-2">
          <span class="text-red-9 text-2xl leading-none">
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
            class="text text-base-11 inline-flex flex-row items-center gap-1 text-sm leading-none"
            :to="`/${orgShortcode}/settings/org/new`">
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
            @click="claim()" />
        </div>
      </template>
    </UnUiModal>
    <UnUiModal v-model="editSendNameModalOpen">
      <template #header>
        <div class="flex flex-row items-center gap-2">
          <span class="leading-none">
            <UnUiIcon name="i-ph-pencil" />
          </span>
          <span class="leading-none"> Edit send name </span>
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <UnUiInput
          v-model:value="editedSendName"
          v-model:valid="editedSendNameValid"
          label="Send name"
          :schema="z.string().trim().min(3).max(64)"
          class="w-full" />
      </div>
      <template #footer>
        <div class="flex flex-row justify-end gap-2">
          <UnUiButton
            label="Cancel"
            variant="outline"
            @click="editSendNameModalOpen = false" />
          <UnUiButton
            label="Save"
            :disabled="!editedSendNameValid"
            @click="editSendName()" />
        </div>
      </template>
    </UnUiModal>
    <div
      v-if="pending"
      class="bg-base-3 flex w-full flex-row justify-center gap-4 rounded-xl rounded-tl-2xl p-4">
      <UnUiIcon
        name="i-svg-spinners:3-dots-fade"
        size="24" />
      <span>Loading</span>
    </div>

    <div
      v-if="!pending"
      class="flex w-full flex-col items-start justify-center gap-8">
      <div
        v-if="!hasAddresses"
        class="flex w-full flex-col items-start justify-center gap-8">
        You have no personal addresses configured, claim them below.
      </div>
      <div
        v-if="
          hasAddresses &&
          (publicAddressesAvailable.length || premiumAddressesAvailable.length)
        "
        class="flex w-full flex-col items-start justify-center gap-8">
        You have unclaimed personal addresses, claim them below.
      </div>
      <div
        v-if="publicAddressesAvailable.length"
        class="flex w-full flex-col items-start justify-center gap-8">
        <div class="flex flex-col gap-2">
          <span class="text-base-11 text-sm font-medium uppercase">
            Available Free email address
          </span>
          <template
            v-for="address of publicAddressesAvailable"
            :key="address">
            <div class="flex flex-row items-center gap-2">
              <div
                class="bg-base-3 flex w-fit min-w-[50px] flex-col items-center rounded-lg px-3 py-2">
                <span class="break-anywhere w-fit text-left font-mono text-sm">
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
        v-if="premiumAddressesAvailable.length"
        class="flex w-full flex-col items-start justify-center gap-8">
        <div class="flex flex-col gap-2">
          <span class="text-base-11 text-sm font-medium uppercase">
            Available Premium email address
          </span>
          <template
            v-for="address of premiumAddressesAvailable"
            :key="address">
            <div class="flex flex-col gap-2">
              <div class="flex flex-row items-center gap-2">
                <div
                  class="bg-base-3 flex w-fit min-w-[50px] flex-col items-center rounded-lg px-3 py-2">
                  <span
                    class="break-anywhere w-fit text-left font-mono text-sm">
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
                organization is subscribed to a plan.
              </span>
            </div>
          </template>
        </div>
      </div>
      <div
        v-if="hasAddresses"
        class="flex w-full flex-col items-start justify-center gap-8">
        <div class="flex w-full flex-col gap-4">
          <span class="text-base-11 text-sm font-medium uppercase">
            Personal email addresses
          </span>
          <span class="">
            You can use these email addresses to send and receive emails with
            the rest of the world.
          </span>

          <NuxtUiTable
            :columns="tableColumns"
            :rows="tableRows"
            :loading="pending"
            class="w-full overflow-x-scroll">
            <template #address-data="{ row }">
              <div class="flex flex-row items-center gap-2">
                <UnUiCopy :text="row.address" /> <span>{{ row.address }}</span>
              </div>
            </template>
            <template #sendName-data="{ row }">
              <UnUiTooltip text="Click to edit">
                <button
                  class="flex cursor-pointer flex-row items-center gap-2"
                  @click="preEdit(row.publicId, row.sendName)">
                  <span class="truncate">{{ row.sendName }}</span>
                  <UnUiIcon
                    name="i-ph-pencil"
                    size="20" />
                </button>
              </UnUiTooltip>
            </template>
            <template #forwarding-data="{ row }">
              <div class="flex flex-row items-center gap-2">
                <UnUiCopy :text="row.forwarding.address" />
                <span>{{ row.forwarding.address }}</span>
              </div>
            </template>
            <template #org-data="{ row }">
              <div class="flex flex-row items-center gap-2">
                <UnUiAvatar
                  :public-id="row.org.publicId"
                  :avatar-timestamp="row.org.avatarTimestamp"
                  type="org"
                  :alt="row.org.name ? row.org.name : ''"
                  size="xs" />
                <span class="">{{ row.org.name }}</span>
              </div>
            </template>
          </NuxtUiTable>
        </div>
      </div>
    </div>
  </div>
</template>
