<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  const { $trpc, $i18n } = useNuxtApp();
  const orgSlug = useRoute().params.orgSlug as string;

  const {
    data: orgUserGroupsQuery,
    pending,
    error,
    refresh
  } = await $trpc.org.users.userGroups.getOrgUserGroups.useLazyQuery(
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
    color: string | null;
    members: ({
      publicId: string;
      firstName: string | null;
      lastName: string | null;
      handle: string | null;
      title: string | null;
    } | null)[];
  }

  const tableRows = ref<TableRow[]>([]);
  watch(orgUserGroupsQuery, (newResults) => {
    if (newResults?.groups) {
      tableRows.value = [];
      for (const group of newResults.groups) {
        console.log({ members: group.members });
        tableRows.value.push({
          publicId: group.publicId,
          name: group.name,
          description: group.description,
          color: group.color,
          // @ts-ignore
          members: group.members.map((member) => member.userProfile)
        });
      }
    }
  });
  function select(row: (typeof tableRows.value)[number]) {
    navigateTo(`/${orgSlug}/settings/org/users/groups/${row.publicId}`);
  }

  const addNewModalOpen = ref(false);
  const closeModal = () => {
    addNewModalOpen.value = false;
    refresh();
  };
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
        <UnUiButton
          label="Add new"
          @click="addNewModalOpen = true" />
        <UnUiModal v-model="addNewModalOpen">
          <template #header>
            <span class="">Add new group</span>
          </template>
          <SettingsAddNewGroup
            lazy
            @close="closeModal()" />
        </UnUiModal>
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
              :public-id="row.publicId"
              :avatar-id="row.avatarId"
              :type="'user'"
              :alt="row.name ? row.name : ''"
              :color="row.color ? row.color : ''"
              size="xs" />
            <span class="">{{ row.name }}</span>
          </div>
        </template>
        <template #members-data="{ row }">
          <NuxtUiAvatarGroup
            size="sm"
            :max="3">
            <UnUiAvatar
              v-for="member in row.members"
              :key="member.publicId"
              :public-id="member.publicId"
              :avatar-id="member.avatarId"
              :type="'user'"
              :alt="
                member.firstName && member.lastName
                  ? member.firstName + ' ' + member.lastName
                  : ''
              "
              :color="member.color ? member.color : ''"
              size="xs" />
            <span v-if="row.members.length === 0"></span>
          </NuxtUiAvatarGroup>
        </template>
      </NuxtUiTable>
    </div>
  </div>
</template>
