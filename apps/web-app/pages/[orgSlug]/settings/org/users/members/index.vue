<script setup lang="ts">
  import { navigateTo, ref, useNuxtApp, watch } from '#imports';

  const { $trpc } = useNuxtApp();

  const { data: orgMembersQuery, pending } =
    await $trpc.org.users.members.getOrgMembers.useLazyQuery(
      {},
      {
        server: false
      }
    );

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
          name: member.profile.firstName + ' ' + member.profile.lastName,
          publicId: member.profile.publicId,
          avatarId: member.profile.avatarId || '',
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
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Members</span>
          <span class="text-sm">Manage your org members</span>
        </div>
      </div>
      <div class="flex flex-row items-center gap-4">
        <button
          class="border-1 border-base-7 bg-base-3 flex max-w-80 flex-row items-center justify-center gap-2 rounded p-2"
          @click="navigateTo('./invites')">
          <UnUiIcon
            name="i-ph-plus"
            size="20" />
          <p class="text-sm">Invite</p>
        </button>
      </div>
    </div>
    <div class="flex w-full flex-col gap-4 overflow-y-auto">
      <NuxtUiTable
        :columns="tableColumns"
        :rows="tableRows"
        :loading="pending"
        class="">
        <template #name-data="{ row }">
          <div class="flex flex-row items-center gap-2">
            <UnUiAvatar
              :public-id="row.publicId"
              :avatar-id="row.avatarId"
              :type="'user'"
              :alt="row.name ? row.name : ''"
              size="xs" />
            <span class="">{{ row.name }}</span>
          </div>
        </template>
        <template #handle-data="{ row }">
          <span class="">@{{ row.handle }}</span>
        </template>
        <template #role-data="{ row }">
          <UnUiBadge
            :color="row.role === 'admin' ? 'amber' : 'blue'"
            variant="solid">
            <span class="uppercase">{{ row.role }}</span>
          </UnUiBadge>
        </template>
        <template #status-data="{ row }">
          <UnUiBadge
            :color="row.status === 'active' ? 'green' : 'red'"
            variant="solid">
            <span class="uppercase">{{ row.status }}</span>
          </UnUiBadge>
        </template>
      </NuxtUiTable>
    </div>
  </div>
</template>
