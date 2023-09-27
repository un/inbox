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
      key: 'name',
      label: 'Name',
      sortable: true
    },
    {
      key: 'handle',
      label: 'Username',
      sortable: true
    },
    {
      key: 'title',
      label: 'Title'
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true
    },
    {
      key: 'joined',
      label: 'Joined',
      sortable: true
    }
  ];

  const tableRows = ref<{}[]>([]);
  watch(orgMembersQuery, (newResults) => {
    if (newResults?.members) {
      for (const member of newResults.members) {
        tableRows.value.push({
          avatar: member.profile.avatarId,
          name: member.profile.firstName + ' ' + member.profile.lastName,
          handle: member.profile.handle,
          title: member.profile.title,
          role: member.role,
          status: member.status,
          joined: member.addedAt.toDateString(),
          removed: member.removedAt?.toDateString()
        });
      }
    }
  });
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Members</span>
          <span class="text-sm">Manage your org members</span>
        </div>
      </div>
      <div class="flex flex-row gap-4 items-center">
        <button
          class="flex flex-row gap-2 p-2 border-1 rounded items-center justify-center border-base-7 bg-base-3 max-w-80"
          @click="navigateTo('./invites')">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">Invite</p>
        </button>
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
        <template #handle-data="{ row }">
          <span class="">@{{ row.handle }}</span>
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
