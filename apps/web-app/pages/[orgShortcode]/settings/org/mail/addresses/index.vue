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
    data: orgEmailIdentities,
    pending,
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
    navigateTo(`/${orgShortcode}/settings/org/mail/addresses/${row.publicId}`);
  }

  const addNewModalOpen = ref(false);
  const closeModal = () => {
    addNewModalOpen.value = false;
    refresh();
  };
  const addNewExternalModalOpen = ref(false);
  const closeExternalModal = () => {
    addNewExternalModalOpen.value = false;
    refresh();
  };

  // TODO: set the destinations column to be an avatar list of users and groups
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
          <span class="font-display text-2xl">Addresses</span>
          <span class="text-sm">
            Manage your organization's email addresses
          </span>
        </div>
      </div>

      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          label="Add new"
          icon="i-ph-plus"
          @click="addNewModalOpen = true" />
        <UnUiModal v-model="addNewModalOpen">
          <template #header>
            <span class="">Add new email address</span>
          </template>
          <SettingsAddNewEmail
            lazy
            @open-external="addNewExternalModalOpen = true"
            @close="closeModal()" />
        </UnUiModal>
        <UnUiModal v-model="addNewExternalModalOpen">
          <template #header>
            <span class="">Add new external email address</span>
          </template>
          <SettingsAddNewEmailExternal
            lazy
            @open-internal="addNewModalOpen = true"
            @close="closeExternalModal()" />
        </UnUiModal>
      </div>
    </div>
    <div class="flex w-full flex-col gap-4 overflow-y-auto">
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
