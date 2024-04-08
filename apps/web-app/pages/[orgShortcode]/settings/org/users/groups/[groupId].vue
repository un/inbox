<script setup lang="ts">
  import {
    navigateTo,
    ref,
    useNuxtApp,
    useRoute,
    useToast,
    watch
  } from '#imports';
  import type { UiColor } from '@u22n/types/ui';
  import type { TypeId } from '@u22n/utils';
  const orgShortcode = useRoute().params.orgShortcode as string;

  const { $trpc } = useNuxtApp();
  const route = useRoute();

  const groupPublicId = route.params.groupId as string;
  const isNewGroup = route.query.new === 'true';

  const showAddNewOrgMember = ref(false);

  const addingOrgMemberId = ref('');

  const { data: groupData, pending: groupPending } =
    await $trpc.org.users.groups.getGroup.useLazyQuery(
      {
        groupPublicId: groupPublicId,
        newGroup: isNewGroup
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
    groupMemberPublicId: TypeId<'groupMembers'>;
    orgMemberPublicId: TypeId<'orgMembers'> | null;
    orgMemberProfilePublicId: TypeId<'orgMemberProfile'> | null;
    avatarTimestamp: Date | null;
    name: string;
    handle: string;
    title: string;
    role: string;
    notifications: string;
  }

  const orgMembersInGroup = ref<string[]>([]);
  const tableRows = ref<TableRow[]>([]);
  watch(groupData, (newResults) => {
    if (newResults?.group?.members) {
      for (const member of newResults.group.members) {
        tableRows.value.push({
          groupMemberPublicId: member.publicId,
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
        orgMembersInGroup.value.push(member.orgMember.publicId);
      }
    }
  });

  const {
    data: orgMembersData,
    pending: orgMembersPending,
    execute: getOrgMembersList
  } = await $trpc.org.users.members.getOrgMembersList.useLazyQuery(
    {},
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
        if (!orgMembersInGroup.value.includes(member.publicId)) {
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

  async function addNewOrgMemberToGroup(orgMemberPublicId: string) {
    const toast = useToast();
    addingOrgMemberId.value = orgMemberPublicId;
    const addOrgMemberToGroupTrpc =
      $trpc.org.users.groups.addOrgMemberToGroup.useMutation();
    await addOrgMemberToGroupTrpc.mutate({
      groupPublicId: groupPublicId,
      orgMemberPublicId: orgMemberPublicId
    });
    if (
      addOrgMemberToGroupTrpc.status.value === 'error' ||
      !addOrgMemberToGroupTrpc.data.value?.publicId
    ) {
      toast.add({
        id: 'add_org_member_to_group_fail',
        title: 'Could not add org member to group',
        description: `${selectedOrgMemberToAdd.value?.name} could not be added to the ${groupData.value?.group?.name} group`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }

    orgMembersInGroup.value.push(orgMemberPublicId);
    // get the org member profile from the org members list
    const member = orgMembersData?.value?.members?.find(
      (member) => member.publicId === orgMemberPublicId
    );
    tableRows.value.push({
      groupMemberPublicId: addOrgMemberToGroupTrpc.data.value?.publicId,
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
      id: 'org_member_added_to_group',
      title: 'Org Member Added',
      description: `${selectedOrgMemberToAdd.value?.name} has been added to the ${groupData.value?.group?.name} group`,
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
          @click="navigateTo(`/${orgShortcode}/settings/org/users/groups`)" />

        <UnUiAvatar
          v-if="groupData?.group"
          :color="groupData?.group?.color || ('base' as UiColor)"
          :name="groupData?.group?.name"
          :public-id="groupData?.group?.publicId"
          :avatar-timestamp="groupData?.group?.avatarTimestamp"
          :type="'group'"
          size="lg" />

        <div class="flex flex-col gap-1">
          <span
            v-if="!groupPending"
            class="font-display text-2xl">
            {{ groupData?.group?.name }}
          </span>
          <span
            v-if="!groupPending"
            class="text-xl">
            {{ groupData?.group?.description }}
          </span>
          <span
            v-if="groupPending"
            class="font-mono text-2xl">
            Loading...
          </span>
        </div>
      </div>
    </div>
    <div class="flex w-full flex-col gap-8 overflow-y-auto">
      <div
        v-if="groupPending"
        class="flex w-full flex-col gap-8">
        <div class="flex flex-row items-center gap-4">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Loading...</span>
            <span class="text-sm">Please wait while we load your group</span>
          </div>
        </div>
      </div>
      <div
        v-if="!groupPending && !groupData?.group"
        class="flex w-full flex-col gap-8">
        <div class="flex flex-row items-center gap-4">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Group not found</span>
            <span class="text-sm"></span>
          </div>
        </div>
      </div>

      <div
        v-if="!groupPending && groupData?.group"
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
            :loading="groupPending">
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
            label="Add more users to the group"
            @click="showAddOrgMember()" />
          <div
            v-if="showAddNewOrgMember && orgMembersPending"
            class="flex w-full flex-row items-center justify-center gap-4">
            <UnUiIcon
              name="i-svg-spinners:3-dots-fade"
              size="32" />
            <span>Loading group members</span>
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
              label="Add to group"
              size="sm"
              :disabled="!selectedOrgMemberToAdd"
              @click="
                addNewOrgMemberToGroup(
                  selectedOrgMemberToAdd?.orgMemberPublicId || ''
                )
              " />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
