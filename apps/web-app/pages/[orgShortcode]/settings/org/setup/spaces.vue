<script setup lang="ts">
  import { navigateTo, ref, useNuxtApp, useRoute, watch } from '#imports';
  import type { TypeId } from '@u22n/utils';
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
    data: orgTeamsQuery,
    pending,
    refresh
  } = await $trpc.org.users.teams.getOrgTeams.useLazyQuery(
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
    publicId: TypeId<'teams'>;
    avatarTimestamp: Date | null;
    name: string;
    description: string | null;
    color: string | null;
    members: ({
      publicId: string;
      orgMemberProfile: {
        publicId: TypeId<'orgMemberProfile'>;
        avatarTimestamp: Date | null;
        firstName: string | null;
        lastName: string | null;
        handle: string | null;
        title: string | null;
      };
    } | null)[];
  }

  const tableRows = ref<TableRow[]>([]);
  watch(orgTeamsQuery, (newResults) => {
    if (newResults?.teams) {
      tableRows.value = [];
      for (const team of newResults.teams) {
        tableRows.value.push({
          publicId: team.publicId,
          avatarTimestamp: team.avatarTimestamp,
          name: team.name,
          description: team.description,
          color: team.color,
          // @ts-ignore
          members: team.members
        });
      }
    }
  });
  function select(row: (typeof tableRows.value)[number]) {
    navigateTo(`/${orgShortcode}/settings/org/users/teams/${row.publicId}`);
  }

  const addNewModalOpen = ref(false);
  const closeModal = () => {
    addNewModalOpen.value = false;
    refresh();
  };
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          v-if="isMobile"
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="navigateTo(`/${orgShortcode}/settings`)" />
        <div class="flex flex-col gap-1">
          <span class="font-display text-2xl">Spaces</span>
          <span class="text-sm">Manage your organizations user teams</span>
        </div>
      </div>
      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          label="Add new"
          @click="addNewModalOpen = true" />
        <UnUiModal v-model="addNewModalOpen">
          <template #header>
            <span class="">Add new team</span>
          </template>
          <SettingsAddNewTeam
            lazy
            @close="closeModal()" />
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
        <template #name-data="{ row }">
          <div class="flex flex-row items-center gap-2">
            <UnUiAvatar
              :public-id="row.publicId"
              :avatar-timestamp="row.avatarTimestamp"
              :type="'orgMember'"
              :alt="row.name ? row.name : ''"
              :color="row.color ? row.color : ''"
              size="xs" />
            <span class="">{{ row.name }}</span>
          </div>
        </template>
        <template #members-data="{ row }">
          <div v-if="row.members.length > 0">
            <NuxtUiAvatarGroup
              size="sm"
              :max="3">
              <UnUiAvatar
                v-for="member in row.members"
                :key="member.publicId"
                :public-id="member.orgMember.orgMemberProfile.publicId"
                :avatar-timestamp="
                  member.orgMemberProfile.orgMemberProfile.avatarTimestamp
                "
                :type="'orgMember'"
                :alt="
                  member.orgMemberProfile.orgMemberProfile.firstName &&
                  member.orgMemberProfile.orgMemberProfile.lastName
                    ? member.orgMemberProfile.orgMemberProfile.firstName +
                      ' ' +
                      member.orgMemberProfile.orgMemberProfile.lastName
                    : ''
                "
                :color="
                  member.orgMemberProfile.orgMemberProfile.color
                    ? member.orgMemberProfile.orgMemberProfile.color
                    : ''
                "
                size="xs" />
            </NuxtUiAvatarGroup>
          </div>

          <div v-else>
            <span class="text-base-11 text-xs">No Members</span>
          </div>
        </template>
      </NuxtUiTable>
    </div>
  </div>
</template>
