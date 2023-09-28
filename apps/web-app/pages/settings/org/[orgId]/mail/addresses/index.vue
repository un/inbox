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
    data: orgMembersQuery,
    pending,
    error,
    refresh
  } = await $trpc.org.members.getOrgMembers.useLazyQuery({
    orgPublicId: orgPublicId
  });

  const tableColumns = [
    {
      key: 'email',
      label: 'Email',
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
      key: 'routing',
      label: 'Route to',
      sortable: true
    }
  ];

  interface TableRow {
    publicId: string;
    name: string;
    description: string | null;
    avatarId: string | null;
    color: string | null;
    members: ({
      publicId: string;
      firstName: string | null;
      lastName: string | null;
      handle: string | null;
      title: string | null;
      avatarId: string | null;
    } | null)[];
  }

  const tableRows = ref<TableRow[]>([]);
  // watch(orgUserGroupsQuery, (newResults) => {
  //   if (newResults?.groups) {
  //     for (const group of newResults.groups) {
  //       tableRows.value.push({
  //         publicId: group.publicId,
  //         name: group.name,
  //         description: group.description,
  //         avatarId: group.avatarId,
  //         color: group.color,
  //         members: group.members.map((member) => member.userProfile)
  //       });
  //     }
  //   }
  // });
  function select(row: (typeof tableRows.value)[number]) {
    navigateTo(`/settings/org/${orgPublicId}/mail/addresses/${row.publicId}`);
  }
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
        class="">
        <template #name-data="{ row }">
          <div class="flex flex-row gap-2 items-center">
            <UnUiAvatar
              :avatarId="row.avatar ? row.avatar : ''"
              :name="row.name ? row.name : ''"
              size="xs" />
            <span class="">{{ row.name }}</span>
          </div>
        </template>
        <template #role-data="{ row }">
          <div
            class="py-1 px-4 rounded-full w-fit"
            :class="row.role === 'admin' ? 'bg-primary-9' : 'bg-base-5'">
            <span class="uppercase text-xs">{{ row.role }}</span>
          </div>
        </template>
        <template #status-data="{ row }">
          <div
            class="py-1 px-4 rounded-full w-fit"
            :class="row.status === 'active' ? 'bg-grass-5' : 'bg-red-5'">
            <span class="uppercase text-xs">{{ row.status }}</span>
          </div>
        </template>
      </UnUiTable>
    </div>
  </div>
</template>
