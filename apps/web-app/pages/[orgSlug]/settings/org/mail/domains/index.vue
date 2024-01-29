<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';
  const orgSlug = useRoute().params.orgSlug as string;

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();

  const showNewModal = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Add Domain');
  const pageError = ref(false);
  const newDomainNameValid = ref<boolean | 'remote' | null>(null);

  const {
    data: orgDomainsQuery,
    pending,
    error,
    refresh
  } = await $trpc.org.mail.domains.getOrgDomains.useLazyQuery(
    {},
    { server: false }
  );

  const tableColumns = [
    {
      key: 'domain',
      label: 'Domain',
      sortable: true
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true
    },
    {
      key: 'sendingMode',
      label: 'SendingMode',
      sortable: true
    },
    {
      key: 'receivingMode',
      label: 'Receiving Mode',
      sortable: true
    }
  ];

  interface TableRow {
    status: string;
    domain: string;
    sendingMode: string;
    receivingMode: string;
    domainId: string;
  }

  const tableRows = ref<TableRow[]>([]);
  watch(
    orgDomainsQuery,
    (newResults) => {
      if (newResults?.domainData) {
        const newTableRows: TableRow[] = [];
        for (const domain of newResults.domainData) {
          newTableRows.push({
            status: domain.domainStatus,
            domain: domain.domain,
            sendingMode: domain.sendingMode,
            receivingMode: domain.receivingMode,
            domainId: domain.publicId
          });
        }
        tableRows.value = newTableRows;
      }
    }
    // ,
    // { immediate: true }
  );

  function select(row: (typeof tableRows.value)[number]) {
    navigateTo(`/${orgSlug}/settings/org/mail/domains/${row.domainId}`);
  }
  const selected = ref<typeof tableRows.value>([]);

  const addNewModalOpen = ref(false);
  const closeModal = () => {
    addNewModalOpen.value = false;
    refresh();
  };
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-col gap-1">
        <span class="text-2xl font-display">Domains</span>
        <span class="text-sm">Manage your organizations domains</span>
      </div>
      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          label="Add new"
          @click="addNewModalOpen = true" />
        <UnUiModal v-model="addNewModalOpen">
          <template #header>
            <span class="">Add new domain</span>
          </template>
          <SettingsAddNewDomain
            lazy
            @close="closeModal()" />
        </UnUiModal>
      </div>
    </div>
    <div class="w-full flex flex-col gap-8 overflow-y-scroll">
      <div class="w-full flex flex-col gap-8">
        <NuxtUiTable
          :columns="tableColumns"
          :rows="tableRows"
          class=""
          :loading="pending"
          @select="select">
          <template #status-data="{ row }">
            <UnUiBadge
              :label="row.status.toUpperCase()"
              :color="row.status === 'active' ? 'green' : 'red'" />
          </template>
          <template #domain-data="{ row }">
            <div class="w-fit">
              <span class="text-md font-mono">{{ row.domain }}</span>
            </div>
          </template>
          <template #sendingMode-data="{ row }">
            <UnUiBadge
              :label="row.sendingMode.toUpperCase()"
              :color="row.sendingMode === 'native' ? 'green' : 'red'" />
          </template>

          <template #receivingMode-data="{ row }">
            <UnUiBadge
              :label="row.receivingMode.toUpperCase()"
              :color="
                row.receivingMode === 'native'
                  ? 'green'
                  : row.receivingMode === 'forwarding'
                    ? 'orange'
                    : 'red'
              " />
          </template>
        </NuxtUiTable>
      </div>
    </div>
  </div>
</template>
