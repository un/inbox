<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();

  const showInviteModal = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Create invite');
  const pageError = ref(false);
  const inviteEmailValid = ref<boolean | 'remote' | null>(null);
  const inviteEmailValue = ref('');
  const inviteEmailValidationMessage = ref('');
  const newInviteCode = ref('');
  const formValid = computed(() => {
    return inviteEmailValid.value === true;
  });

  const orgPublicId = useRoute().params.orgId as string;

  const {
    data: orgDomainsQuery,
    pending,
    error,
    refresh
  } = await $trpc.org.mail.domains.getOrgDomains.useLazyQuery({
    orgPublicId: orgPublicId
  });

  console.log(orgDomainsQuery);

  const tableColumns = [
    {
      key: 'status',
      label: 'Status',
      sortable: true
    },
    {
      key: 'domain',
      label: 'Domain',
      sortable: true
    },
    {
      key: 'dns',
      label: 'DNS Status',
      sortable: true
    },
    {
      key: 'mode',
      label: 'Mail Mode',
      sortable: true
    }
  ];

  interface TableRow {
    status: string;
    domain: string;
    dns: string;
    mode: string;
    domainId: string;
  }

  const tableRows = ref<TableRow[]>([]);
  watch(orgDomainsQuery, (newResults) => {
    if (newResults?.domainData) {
      const newTableRows: TableRow[] = [];
      for (const domain of newResults.domainData) {
        newTableRows.push({
          status: domain.status,
          domain: domain.domain,
          dns: domain.dnsStatus,
          mode: domain.mode,
          domainId: domain.publicId
        });
      }
      tableRows.value = newTableRows;
    }
  });

  // async function createInvite() {
  //   if (inviteEmailValid.value === false) return;
  //   buttonLoading.value = true;
  //   buttonLabel.value = 'Creating invite...';
  //   const newInviteResponse = await $trpc.org.invites.createNewInvite.mutate({
  //     orgPublicId: orgPublicId,
  //     inviteeEmail: inviteEmailValue.value,
  //     role: 'member'
  //   });
  //   buttonLoading.value = false;
  //   buttonLabel.value = 'All done';
  //   inviteEmailValue.value = '';
  //   newInviteCode.value = newInviteResponse.inviteToken;
  //   refresh();
  // }

  function select(row: (typeof tableRows.value)[number]) {
    navigateTo(`/settings/org/${orgPublicId}/mail/domains/${row.domainId}`);
  }
  const selected = ref<typeof tableRows.value>([]);
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Domains</span>
          <span class="text-sm">Manage your organizations domains</span>
        </div>
      </div>
      <div class="flex flex-row gap-4 items-center">
        <button
          class="flex flex-row gap-2 p-2 border-1 rounded items-center justify-center border-base-7 bg-base-3 max-w-80"
          @click="showInviteModal = !showInviteModal">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">Add new</p>
        </button>
      </div>
    </div>
    <div class="flex flex-col gap-8 w-full overflow-y-scroll">
      <div class="flex flex-col gap-8 w-full">
        <UnUiTable
          :columns="tableColumns"
          :rows="tableRows"
          class=""
          :loading="pending"
          @select="select">
          <template #status-data="{ row }">
            <div
              class="py-1 px-4 rounded-full w-fit"
              :class="row.status === 'active' ? 'bg-grass-5' : 'bg-red-5'">
              <span class="uppercase text-xs">{{ row.status }}</span>
            </div>
          </template>
          <template #domain-data="{ row }">
            <div class="w-fit">
              <span class="text-md font-mono">{{ row.domain }}</span>
            </div>
          </template>
          <template #dns-data="{ row }">
            <div
              class="py-1 px-4 rounded-full w-fit"
              :class="row.dns === 'valid' ? 'bg-grass-5' : 'bg-red-5'">
              <span class="uppercase text-xs">{{ row.dns }}</span>
            </div>
          </template>

          <template #mode-data="{ row }">
            <div
              class="py-1 px-4 rounded-full w-fit"
              :class="row.mode === 'valid' ? 'bg-grass-5' : 'bg-red-5'">
              <span class="uppercase text-xs">{{ row.mode }}</span>
            </div>
          </template>
        </UnUiTable>
      </div>
    </div>
  </div>
</template>
