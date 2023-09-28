<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Save profile');
  const pageError = ref(false);
  const orgNameValid = ref<boolean | 'remote' | null>(null);
  const orgNameValue = ref('');
  const orgNameValidationMessage = ref('');

  const orgPublicId = useRoute().params.orgId as string;

  const {
    data: orgEmailIdentities,
    pending,
    error,
    refresh
  } = await $trpc.org.mail.emailIdentities.getOrgEmailIdentities.useLazyQuery({
    orgPublicId: orgPublicId
  });

  const tableColumns = [
    {
      key: 'address',
      label: 'Address',
      sortable: true
    },
    {
      key: 'domain',
      label: 'Domain',
      sortable: true
    },
    {
      key: 'sendName',
      label: 'SendName'
    },
    {
      key: 'destination',
      label: 'Destination',
      sortable: true
    },
    {
      key: 'catchAll',
      sortable: true
    }
  ];

  interface TableRow {
    publicId: string;
    address: string;
    domain: string;
    sendName: string | null;
    catchAll: boolean;
    destination: string;
  }

  const tableRows = ref<TableRow[]>([]);
  watch(orgEmailIdentities, (newResults) => {
    if (newResults?.emailIdentityData) {
      for (const identity of newResults.emailIdentityData) {
        tableRows.value.push({
          publicId: identity.publicId,
          address: identity.username,
          domain: identity.domainName,
          sendName: identity.sendName,
          catchAll: identity.isCatchAll,
          destination:
            identity.routingRules.description || identity.routingRules.name
        });
      }
    }
  });
  function select(row: (typeof tableRows.value)[number]) {
    navigateTo(`/settings/org/${orgPublicId}/mail/addresses/${row.publicId}`);
  }

  // TODO: set the destinations column to be an avatar list of users and groups
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Addresses</span>
          <span class="text-sm"
            >Manage your organization's email addresses</span
          >
        </div>
      </div>
      <div class="flex flex-row gap-4 items-center">
        <nuxt-link
          class="flex flex-row gap-2 p-2 border-1 rounded items-center justify-center border-base-7 bg-base-3 max-w-80"
          :to="`/settings/org/${orgPublicId}/mail/addresses/new`">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">Add new</p>
        </nuxt-link>
      </div>
    </div>
    <div class="flex flex-col gap-4 w-full overflow-y-scroll">
      <UnUiTable
        :columns="tableColumns"
        :rows="tableRows"
        :loading="pending"
        class=""
        @select="select">
        <template #address-data="{ row }">
          <span class="">{{ row.address }}</span>
        </template>
        <template #catchAll-data="{ row }">
          <div
            class="py-1 px-4 rounded-full w-fit bg-primary-9 text-black"
            v-if="row.catchAll">
            <span class="uppercase text-xs">catch-all</span>
          </div>
          <span v-if="!row.catchAll"></span>
        </template>
        <template #domain-data="{ row }">
          <span class="">@{{ row.domain }}</span>
        </template>
      </UnUiTable>
    </div>
  </div>
</template>
