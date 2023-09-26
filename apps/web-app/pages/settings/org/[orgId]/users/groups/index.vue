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
  } = await $trpc.org.userGroups.getOrgUserGroups.useLazyQuery({
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
    members: {
      userProfile: {
        publicId: string;
        firstName: string | null;
        lastName: string | null;
        nickname: string | null;
        title: string | null;
        avatarId: string | null;
      } | null;
    }[];
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
          members: group.members
        });
      }
    }
  });
  function select(row: (typeof tableRows.value)[number]) {
    navigateTo(`/settings/org/${orgPublicId}/users/groups/${row.publicId}`);
  }
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Groups</span>
          <span class="text-sm">Manage your organizations user groups</span>
        </div>
      </div>
      <div class="flex flex-row gap-4 items-center">
        <button
          class="flex flex-row gap-2 p-2 border-1 rounded items-center justify-center border-base-7 bg-base-3 max-w-80"
          @click="navigateTo('./groups/new')">
          <icon
            name="ph-plus"
            size="20" />
          <p class="text-sm">New Group</p>
        </button>
      </div>
    </div>
    <div class="flex flex-col gap-4 w-full overflow-y-scroll">
      <UnUiTable
        :columns="tableColumns"
        :rows="tableRows"
        :loading="pending"
        class=""
        @select="select">
        <template #name-data="{ row }">
          <div class="flex flex-row gap-2 items-center">
            <UnUiAvatar
              :avatarId="row.avatarId ? row.avatarId : ''"
              :name="row.name ? row.name : ''"
              :color="row.color ? row.color : ''"
              size="xs" />
            <span class="">{{ row.name }}</span>
          </div>
        </template>
        <template #members-data="{ row }">
          <UnUiAvatarList
            :avatars="row.members"
            :max="3"
            size="xs" />
        </template>
      </UnUiTable>
    </div>
  </div>
</template>
