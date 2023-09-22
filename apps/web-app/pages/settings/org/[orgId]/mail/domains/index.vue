<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();

  const showNewModal = ref(false);
  const buttonLoading = ref(false);
  const buttonLabel = ref('Add Domain');
  const pageError = ref(false);
  const newDomainNameValid = ref<boolean | 'remote' | null>(null);
  const newDomainNameValue = ref('');
  const newDomainNameValidationMessage = ref('');
  const newDomainResponseError = ref('');
  const newDomainPublicId = ref('');
  const formValid = computed(() => {
    return newDomainNameValid.value === true;
  });

  const orgPublicId = useRoute().params.orgId as string;

  const {
    data: orgDomainsQuery,
    pending,
    error,
    refresh
  } = await $trpc.org.mail.domains.getOrgDomains.useLazyQuery(
    {
      orgPublicId: orgPublicId
    },
    { server: false }
  );

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

  async function createNewDomain() {
    if (newDomainNameValid.value === false) return;
    buttonLoading.value = true;
    buttonLabel.value = 'Creating domain...';
    const newDomainResponse =
      await $trpc.org.mail.domains.createNewDomain.mutate({
        orgPublicId: orgPublicId,
        domainName: newDomainNameValue.value
      });

    if (newDomainResponse.error) {
      buttonLoading.value = false;
      buttonLabel.value = 'Add Domain';
      newDomainNameValid.value = false;
      newDomainResponseError.value = newDomainResponse.error;
      return;
    }
    buttonLoading.value = false;
    buttonLabel.value = 'All done';

    navigateTo(
      `/settings/org/${orgPublicId}/mail/domains/${newDomainResponse.domainId}`
    );
  }

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
          @click="showNewModal = !showNewModal">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">Add new</p>
        </button>
      </div>
    </div>
    <div
      class="flex flex-col gap-4 w-full"
      v-if="showNewModal">
      <span class="text-xl font-semibold">Add a new domain</span>
      <UnUiInput
        v-model:value="newDomainNameValue"
        v-model:valid="newDomainNameValid"
        v-model:validationMessage="newDomainNameValidationMessage"
        label="Domain name"
        placeholder=""
        :schema="z.string().min(4).includes('.')" />
      <UnUiButton
        :label="buttonLabel"
        :loading="buttonLoading"
        :disabled="!formValid"
        size="sm"
        @click="createNewDomain()" />
      <div
        v-if="newDomainResponseError"
        class="bg-red-3 w-fit px-4 py-1 rounded-lg">
        {{ newDomainResponseError }}
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
