<script setup lang="ts">
  import {
    navigateTo,
    ref,
    useNuxtApp,
    useRoute,
    useToast,
    watch
  } from '#imports';
  import type { TypeId } from '@u22n/utils/typeid';
  import type { UiColor } from '@u22n/utils/colors';
  const orgShortCode = (useRoute().params.orgShortCode ?? '') as string;

  const { $trpc } = useNuxtApp();
  const route = useRoute();
  const { data: isAdmin } =
    await $trpc.org.users.members.isOrgMemberAdmin.useQuery({ orgShortCode });

  if (!isAdmin.value) {
    await navigateTo(`/${orgShortCode}/settings`);
  }

  const teamPublicId = route.params.teamId as string;
  const isNewTeam = route.query.new === 'true';

  const showAddNewOrgMember = ref(false);

  const addingOrgMemberId = ref('');

  const { data: teamData, pending: teamPending } =
    await $trpc.org.users.teams.getTeam.useLazyQuery(
      {
        teamPublicId: teamPublicId,
        newTeam: isNewTeam,
        orgShortCode
      },
      { server: false }
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
    }
  ];
  interface TableRow {
    teamMemberPublicId: TypeId<'teamMembers'>;
    orgMemberPublicId: TypeId<'orgMembers'> | null;
    orgMemberProfilePublicId: TypeId<'orgMemberProfile'> | null;
    avatarTimestamp: Date | null;
    name: string;
    handle: string;
    title: string;
    role: string;
    notifications: string;
  }

  const orgMembersInTeam = ref<string[]>([]);
  const tableRows = ref<TableRow[]>([]);
  watch(teamData, (newResults) => {
    if (newResults?.team?.members) {
      for (const member of newResults.team.members) {
        tableRows.value.push({
          teamMemberPublicId: member.publicId,
          orgMemberPublicId: member.orgMember.publicId,
          orgMemberProfilePublicId: member.orgMemberProfile?.publicId || null,
          avatarTimestamp: member.orgMemberProfile?.avatarTimestamp || null,
          name:
            member.orgMemberProfile?.firstName +
            ' ' +
            member.orgMemberProfile?.lastName,
          handle: member.orgMemberProfile?.handle || '',
          title: member.orgMemberProfile?.title || '',
          role: member.role,
          notifications: member.notifications
        });
        orgMembersInTeam.value.push(member.orgMember.publicId);
      }
    }
  });

  const {
    data: orgMembersData,
    pending: orgMembersPending,
    execute: getOrgMembersList
  } = await $trpc.org.users.members.getOrgMembersList.useLazyQuery(
    { orgShortCode },
    { server: false, immediate: false }
  );

  function showAddOrgMember() {
    getOrgMembersList();
    showAddNewOrgMember.value = true;
  }

  interface OrgMemberDropdownData {
    orgMemberPublicId: string;
    label: string;
    name: string;
    handle: string;
    role: string;
  }

  const orgMembersDropdownData = ref<OrgMemberDropdownData[]>([]);
  watch(orgMembersData, (newOrgMembersData) => {
    if (newOrgMembersData?.members) {
      for (const member of newOrgMembersData.members) {
        if (!orgMembersInTeam.value.includes(member.publicId)) {
          orgMembersDropdownData.value.push({
            orgMemberPublicId: member.publicId,
            label:
              member.profile?.firstName +
              ' ' +
              member.profile?.lastName +
              ' - @' +
              member.profile?.handle,
            name: member.profile?.firstName + ' ' + member.profile?.lastName,
            handle: member.profile?.handle || '',
            role: member.role
          });
        }
      }
    }
  });

  const selectedOrgMemberToAdd = ref<OrgMemberDropdownData | undefined>(
    undefined
  );

  async function addNewOrgMemberToTeam(orgMemberPublicId: string) {
    const toast = useToast();
    addingOrgMemberId.value = orgMemberPublicId;
    const addOrgMemberToTeamTrpc =
      $trpc.org.users.teams.addOrgMemberToTeam.useMutation();
    await addOrgMemberToTeamTrpc.mutate({
      teamPublicId: teamPublicId,
      orgMemberPublicId: orgMemberPublicId,
      orgShortCode
    });
    if (
      addOrgMemberToTeamTrpc.status.value === 'error' ||
      !addOrgMemberToTeamTrpc.data.value?.publicId
    ) {
      toast.add({
        id: 'add_org_member_to_team_fail',
        title: 'Could not add org member to team',
        description: `${selectedOrgMemberToAdd.value?.name} could not be added to the ${teamData.value?.team?.name} team`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }

    orgMembersInTeam.value.push(orgMemberPublicId);
    // get the org member profile from the org members list
    const member = orgMembersData?.value?.members?.find(
      (member) => member.publicId === orgMemberPublicId
    );
    tableRows.value.push({
      teamMemberPublicId: addOrgMemberToTeamTrpc.data.value?.publicId,
      orgMemberPublicId: member?.publicId || null,
      orgMemberProfilePublicId: member?.profile.publicId || null,
      avatarTimestamp: member?.profile.avatarTimestamp || null,
      name: member?.profile.firstName + ' ' + member?.profile.lastName,
      handle: member?.profile.handle || '',
      title: member?.profile.title || '',
      role: '',
      notifications: ''
    });

    addingOrgMemberId.value = '';
    toast.add({
      id: 'org_member_added_to_team',
      title: 'Org Member Added',
      description: `${selectedOrgMemberToAdd.value?.name} has been added to the ${teamData.value?.team?.name} team`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
  }
</script>

<template>
  <div class="flex h-full w-full flex-col items-start gap-8 p-4">
    <div class="flex w-full flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <UnUiButton
          icon="i-ph-arrow-left"
          square
          variant="soft"
          @click="navigateTo(`/${orgShortCode}/settings/org/users/teams`)" />

        <UnUiAvatar
          v-if="teamData?.team"
          :color="teamData?.team?.color || ('base' as UiColor)"
          :name="teamData?.team?.name"
          :public-id="teamData?.team?.publicId"
          :avatar-timestamp="teamData?.team?.avatarTimestamp"
          :type="'team'"
          size="lg" />

        <div class="flex flex-col gap-1">
          <span
            v-if="!teamPending"
            class="font-display text-2xl">
            {{ teamData?.team?.name }}
          </span>
          <span
            v-if="!teamPending"
            class="text-xl">
            {{ teamData?.team?.description }}
          </span>
          <span
            v-if="teamPending"
            class="font-mono text-2xl">
            Loading...
          </span>
        </div>
      </div>
    </div>
    <div class="flex w-full flex-col gap-8 overflow-y-auto">
      <div
        v-if="teamPending"
        class="flex w-full flex-col gap-8">
        <div class="flex flex-row items-center gap-4">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Loading...</span>
            <span class="text-sm">Please wait while we load your team</span>
          </div>
        </div>
      </div>
      <div
        v-if="!teamPending && !teamData?.team"
        class="flex w-full flex-col gap-8">
        <div class="flex flex-row items-center gap-4">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Team not found</span>
            <span class="text-sm"></span>
          </div>
        </div>
      </div>

      <div
        v-if="!teamPending && teamData?.team"
        class="flex w-full flex-col gap-8">
        <div class="flex flex-col gap-4">
          <div class="border-b-1 border-base-5 w-full pb-2">
            <span class="text-base-11 text-sm font-semibold uppercase">
              Members
            </span>
          </div>
          <NuxtUiTable
            :columns="tableColumns"
            :rows="tableRows"
            class="text-md"
            :loading="teamPending">
            <template #name-data="{ row }">
              <div class="flex flex-row items-center gap-2">
                <UnUiAvatar
                  :public-id="row.orgMemberProfilePublicId"
                  :avatar-timestamp="row.avatarTimestamp"
                  :type="'orgMember'"
                  :alt="row.name"
                  size="xs" />
                <span class="">{{ row.name }}</span>
              </div>
            </template>
            <template #handle-data="{ row }">
              <span class="">@{{ row.handle }}</span>
            </template>
            <template #title-data="{ row }">
              <div class="w-fit">
                <span class="text-md">{{ row.title }}</span>
              </div>
            </template>
            <template #notifications-data="{ row }">
              <UnUiTooltip
                :text="
                  row.notifications === 'active'
                    ? 'Active'
                    : row.notifications === 'muted'
                      ? 'Muted'
                      : 'Off'
                ">
                <UnUiIcon
                  :name="
                    row.notifications === 'active'
                      ? 'i-ph-bell-simple-ringing'
                      : row.notifications === 'muted'
                        ? 'i-ph-speaker-simple-slash'
                        : 'i-ph-bell-simple-slash'
                  " />
              </UnUiTooltip>
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
          </NuxtUiTable>
          <UnUiButton
            v-if="!showAddNewOrgMember"
            label="Add more users to the team"
            @click="showAddOrgMember()" />
          <div
            v-if="showAddNewOrgMember && orgMembersPending"
            class="flex w-full flex-row items-center justify-center gap-4">
            <UnUiIcon
              name="i-svg-spinners:3-dots-fade"
              size="32" />
            <span>Loading team members</span>
          </div>
          <div
            v-if="showAddNewOrgMember && !orgMembersPending"
            class="grid w-full grid-cols-2 gap-4">
            <NuxtUiSelectMenu
              v-model="selectedOrgMemberToAdd"
              searchable
              searchable-placeholder="Search a person..."
              placeholder="Select a person"
              :options="orgMembersDropdownData">
              <template
                v-if="selectedOrgMemberToAdd"
                #label>
                <UnUiIcon
                  name="i-ph-check"
                  class="h-4 w-4" />

                {{ selectedOrgMemberToAdd.label }}
                <UnUiTooltip
                  v-if="selectedOrgMemberToAdd.role === 'admin'"
                  text="Organization Admin">
                  <UnUiIcon
                    name="i-ph-crown"
                    class="text-yellow-8" />
                </UnUiTooltip>
              </template>
              <template #option="{ option }">
                <UnUiAvatar
                  :public-id="option.orgMemberProfilePublicId"
                  :avatar-timestamp="option.avatarTimestamp"
                  :type="'orgMember'"
                  :alt="option.label"
                  size="3xs" />

                {{ option.label }}
                <UnUiTooltip
                  v-if="option.role === 'admin'"
                  text="Organization Admin">
                  <UnUiIcon
                    name="i-ph-crown"
                    class="text-yellow-8" />
                </UnUiTooltip>
              </template>
            </NuxtUiSelectMenu>
            <UnUiButton
              label="Add to team"
              size="sm"
              :disabled="!selectedOrgMemberToAdd"
              @click="
                addNewOrgMemberToTeam(
                  selectedOrgMemberToAdd?.orgMemberPublicId || ''
                )
              " />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
