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
      `/settings/org/${orgPublicId}/mail/domains/${newDomainResponse.domainId}/?new=true`
    );
  }

  function select(row: (typeof tableRows.value)[number]) {
    navigateTo(`/settings/org/${orgPublicId}/mail/domains/${row.domainId}`);
  }
  const selected = ref<typeof tableRows.value>([]);

  const canAddDomain = ref<boolean | null | undefined>(null);
  const canAddDomainAllowedPlans = ref<string[]>();

  if (useEE().config.modules.billing) {
    console.log('checking if can use feature');
    const { data: canUseFeature } =
      await $trpc.org.setup.billing.canUseFeature.useLazyQuery(
        {
          orgPublicId: orgPublicId,
          feature: 'customDomains'
        },
        { server: false }
      );

    canAddDomain.value = canUseFeature.value?.canUse;
    canAddDomainAllowedPlans.value = canUseFeature.value?.allowedPlans;
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-display">Domains</span>
          <span class="text-sm">Manage your organizations domains</span>
        </div>
      </div>
      <div class="flex flex-row items-center gap-4">
        <button
          class="max-w-80 flex flex-row items-center justify-center gap-2 border-1 border-base-7 rounded bg-base-3 p-2"
          @click="showNewModal = !showNewModal">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">Add new</p>
        </button>
      </div>
    </div>
    <div
      v-if="showNewModal && canAddDomain"
      class="w-full flex flex-col gap-4">
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
        class="w-fit rounded-lg bg-red-3 px-4 py-1">
        {{ newDomainResponseError }}
      </div>
    </div>
    <div
      v-if="showNewModal && !canAddDomain"
      class="w-full flex flex-col gap-4">
      <span class="text-xl font-semibold">Add a new domain</span>
      <span
        >Sorry, your current billing plan does not support adding custom
        domains.</span
      >
      <span>Supported plans are: {{ canAddDomainAllowedPlans }}</span>
    </div>
    <div class="w-full flex flex-col gap-8 overflow-y-scroll">
      <div class="w-full flex flex-col gap-8">
        <UnUiTable
          :columns="tableColumns"
          :rows="tableRows"
          class=""
          :loading="pending"
          @select="select">
          <template #status-data="{ row }">
            <div
              class="w-fit rounded-full px-4 py-1"
              :class="row.status === 'active' ? 'bg-grass-5' : 'bg-red-5'">
              <span class="text-xs uppercase">{{ row.status }}</span>
            </div>
          </template>
          <template #domain-data="{ row }">
            <div class="w-fit">
              <span class="text-md font-mono">{{ row.domain }}</span>
            </div>
          </template>
          <template #sendingMode-data="{ row }">
            <div
              class="w-fit rounded-full px-4 py-1"
              :class="row.sendingMode === 'native' ? 'bg-grass-5' : 'bg-red-5'">
              <span class="text-xs uppercase">{{ row.sendingMode }}</span>
            </div>
          </template>

          <template #receivingMode-data="{ row }">
            <div
              class="w-fit rounded-full px-4 py-1"
              :class="
                row.receivingMode === 'native'
                  ? 'bg-grass-5'
                  : row.receivingMode === 'forwarding'
                  ? 'bg-orange-5'
                  : 'bg-red-5'
              ">
              <span class="text-xs uppercase">{{ row.receivingMode }}</span>
            </div>
          </template>
        </UnUiTable>
      </div>
    </div>
  </div>
</template>
