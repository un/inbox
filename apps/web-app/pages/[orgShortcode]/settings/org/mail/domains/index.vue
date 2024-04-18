<script setup lang="ts">
  import { navigateTo, ref, useNuxtApp, useRoute, watch } from '#imports';
  import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

  const breakpoints = useBreakpoints(breakpointsTailwind);
  const isMobile = breakpoints.smaller('lg'); // only smaller than lg

  const { $trpc } = useNuxtApp();
  const orgShortcode = useRoute().params.orgShortcode as string;
  const { data: isAdmin } =
    await $trpc.org.users.members.isOrgMemberAdmin.useQuery({});

  if (!isAdmin.value) {
    await navigateTo(`/${orgShortcode}/settings`);
  }

  const {
    data: orgDomainsQuery,
    pending,
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
    navigateTo(`/${orgShortcode}/settings/org/mail/domains/${row.domainId}`);
  }

  function rowStatusColor(
    status: 'unverified' | 'pending' | 'active' | 'disabled'
  ) {
    switch (status) {
      case 'unverified':
        return 'red';
      case 'pending':
        return 'amber';
      case 'active':
        return 'green';
      case 'disabled':
        return 'red';
    }
  }
  function rowSendingModeColor(status: 'native' | 'external' | 'disabled') {
    switch (status) {
      case 'disabled':
        return 'red';
      case 'external':
        return 'amber';
      case 'native':
        return 'green';
    }
  }
  function rowReceivingModeColor(status: 'native' | 'forwarding' | 'disabled') {
    switch (status) {
      case 'disabled':
        return 'red';
      case 'forwarding':
        return 'amber';
      case 'native':
        return 'green';
    }
  }

  const addNewModalOpen = ref(false);
  const closeModal = () => {
    addNewModalOpen.value = false;
    refresh();
  };
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-2">
        <div>
          <UnUiButton
            v-if="isMobile"
            icon="i-ph-arrow-left"
            square
            variant="soft"
            @click="navigateTo(`/${orgShortcode}/settings`)" />
        </div>

        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Domains</span>
          <span class="text-sm">Manage your organizations domains</span>
        </div>
      </div>
      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          label="Add new"
          icon="i-ph-plus"
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
    <div class="flex w-full flex-col gap-8 overflow-y-auto">
      <div class="flex w-full flex-col gap-8">
        <NuxtUiTable
          :columns="tableColumns"
          :rows="tableRows"
          class=""
          :loading="pending"
          @select="select">
          <template #status-data="{ row }">
            <UnUiBadge
              :label="row.status.toUpperCase()"
              :color="rowStatusColor(row.status)" />
          </template>
          <template #domain-data="{ row }">
            <div class="w-fit">
              <span class="text-md font-mono">{{ row.domain }}</span>
            </div>
          </template>
          <template #sendingMode-data="{ row }">
            <UnUiBadge
              :label="row.sendingMode.toUpperCase()"
              :color="rowSendingModeColor(row.sendingMode)" />
          </template>

          <template #receivingMode-data="{ row }">
            <UnUiBadge
              :label="row.receivingMode.toUpperCase()"
              :color="rowReceivingModeColor(row.receivingMode)" />
          </template>
        </NuxtUiTable>
      </div>
    </div>
  </div>
</template>
