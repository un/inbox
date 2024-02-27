<script setup lang="ts">
  import { z } from 'zod';
  const { $trpc, $i18n } = useNuxtApp();
  const uploadLoading = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Save profile');
  const pageError = ref(false);
  const orgNameValid = ref<boolean | 'remote' | null>(null);
  const orgNameValue = ref('');
  const orgNameValidationMessage = ref('');

  const orgSlug = useRoute().params.orgSlug as string;

  const {
    data: orgEmailIdentities,
    pending,
    error,
    refresh
  } = await $trpc.org.mail.emailIdentities.getOrgEmailIdentities.useLazyQuery(
    {},
    { server: false }
  );

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
      label: 'SendName',
      sortable: true
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
      tableRows.value = [];
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
    navigateTo(`/${orgSlug}/settings/org/mail/addresses/${row.publicId}`);
  }

  const addNewModalOpen = ref(false);
  const closeModal = () => {
    addNewModalOpen.value = false;
    refresh();
  };

  // TODO: set the destinations column to be an avatar list of users and groups
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-col gap-1">
        <span class="text-2xl font-display">Addresses</span>
        <span class="text-sm">Manage your organization's email addresses</span>
      </div>

      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          label="Add new"
          @click="addNewModalOpen = true" />
        <UnUiModal v-model="addNewModalOpen">
          <template #header>
            <span class="">Add new email address</span>
          </template>
          <SettingsAddNewEmail
            lazy
            @close="closeModal()" />
        </UnUiModal>
      </div>
    </div>
    <div class="w-full flex flex-col gap-4 overflow-y-auto">
      <NuxtUiTable
        :columns="tableColumns"
        :rows="tableRows"
        :loading="pending"
        class=""
        @select="select">
        <template #address-data="{ row }">
          <span class="">{{ row.address }}</span>
        </template>
        <template #catchAll-data="{ row }">
          <UnUiBadge
            v-if="row.catchAll"
            :label="row.catchAll" />
          <span v-if="!row.catchAll"></span>
        </template>
        <template #domain-data="{ row }">
          <span class="">@{{ row.domain }}</span>
        </template>
      </NuxtUiTable>
    </div>
  </div>
</template>
