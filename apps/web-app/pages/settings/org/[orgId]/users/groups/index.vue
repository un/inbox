<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  const { $trpc, $i18n } = useNuxtApp();

  const orgPublicId = useRoute().params.orgId as string;

  const {
    data: orgUserGroupsQuery,
    pending,
    error,
    refresh
  } = await $trpc.org.users.userGroups.getOrgUserGroups.useLazyQuery({
    orgPublicId: orgPublicId
  });

  const tableColumns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true
    },
    {
      key: 'description',
      label: 'Description',
      sortable: true
    },
    {
      key: 'members',
      label: 'Members'
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
  watch(orgUserGroupsQuery, (newResults) => {
    if (newResults?.groups) {
      for (const group of newResults.groups) {
        tableRows.value.push({
          publicId: group.publicId,
          name: group.name,
          description: group.description,
          avatarId: group.avatarId,
          color: group.color,
          members: group.members.map((member) => member.userProfile)
        });
      }
    }
  });
  function select(row: (typeof tableRows.value)[number]) {
    navigateTo(`/settings/org/${orgPublicId}/users/groups/${row.publicId}`);
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-display">Groups</span>
          <span class="text-sm">Manage your organizations user groups</span>
        </div>
      </div>
      <div class="flex flex-row items-center gap-4">
        <button
          class="max-w-80 flex flex-row items-center justify-center gap-2 border-1 border-base-7 rounded bg-base-3 p-2"
          @click="navigateTo(`/settings/org/${orgPublicId}/users/groups/new`)">
          <UnUiIcon
            name="i-ph-plus"
            size="20" />
          <p class="text-sm">New Group</p>
        </button>
      </div>
    </div>
    <div class="w-full flex flex-col gap-4 overflow-y-scroll">
      <NuxtUiTable
        :columns="tableColumns"
        :rows="tableRows"
        :loading="pending"
        class=""
        @select="select">
        <template #name-data="{ row }">
          <div class="flex flex-row items-center gap-2">
            <UnUiAvatar
              :avatar-id="row.avatarId ? row.avatarId : ''"
              :name="row.name ? row.name : ''"
              :color="row.color ? row.color : ''"
              size="xs" />
            <span class="">{{ row.name }}</span>
          </div>
        </template>
        <template #members-data="{ row }">
          <div class="flex flex-row gap-2">
            <UnUiAvatar
              v-for="member in row.members"
              :key="member.publicId"
              :avatar-id="member.avatarId ? member.avatarId : ''"
              :name="
                member.firstName && member.lastName
                  ? member.firstName + ' ' + member.lastName
                  : ''
              "
              :color="member.color ? member.color : ''"
              size="xs" />
            <span v-if="row.members.length === 0"></span>
          </div>
        </template>
      </NuxtUiTable>
    </div>
  </div>
</template>
