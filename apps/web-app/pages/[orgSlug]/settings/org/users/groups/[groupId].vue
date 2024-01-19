<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard, useTimeAgo } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();
  const route = useRoute();
  const orgSlug = useRoute().params.orgSlug as string;

  const groupPublicId = route.params.groupId as string;
  const isNewGroup = route.query.new === 'true';

  const addNewUserButtonLabel = ref('Add users to group');
  const addNewUserButtonLoading = ref(false);
  const showAddNewUser = ref(false);

  const addingUserId = ref('');

  const {
    data: groupData,
    pending: groupPending,
    error,
    refresh
  } = await $trpc.org.users.userGroups.getUserGroup.useLazyQuery(
    {
      userGroupPublicId: groupPublicId,
      newUserGroup: isNewGroup
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
    publicId: string;
    name: string;
    handle: string;
    title: string;
    role: string;
    notifications: string;
  }

  const usersInGroup = ref<string[]>([]);
  const tableRows = ref<TableRow[]>([]);
  watch(groupData, (newResults) => {
    if (newResults?.group?.members) {
      console.log(JSON.stringify(newResults.group.members, null, 2));
      for (const member of newResults.group.members) {
        tableRows.value.push({
          publicId: member.publicId,
          name:
            member.userProfile?.firstName + ' ' + member.userProfile?.lastName,
          handle: member.userProfile?.handle || '',
          title: member.userProfile?.title || '',
          role: member.role,
          notifications: member.notifications
        });
        usersInGroup.value.push(member.orgMember.publicId);
      }
    }
  });

  const {
    data: orgMembersData,
    pending: orgMembersPending,
    error: orgMembersError,
    execute: getOrgMembersList,
    refresh: orgMembersRefresh
  } = await $trpc.org.users.members.getOrgMembersList.useLazyQuery(
    {},
    { server: false, immediate: false }
  );

  function showAddUser() {
    getOrgMembersList();
    showAddNewUser.value = true;
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
        if (!usersInGroup.value.includes(member.publicId)) {
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

  const selectedUserToAdd = ref<OrgMemberDropdownData | undefined>(undefined);

  async function addNewUserToGroup(orgMemberPublicId: string) {
    const toast = useToast();
    addingUserId.value = orgMemberPublicId;
    const addUserToGroupTrpc =
      $trpc.org.users.userGroups.addUserToGroup.useMutation();
    await addUserToGroupTrpc.mutate({
      groupPublicId: groupPublicId,
      orgMemberPublicId: orgMemberPublicId
    });
    if (addUserToGroupTrpc.status.value === 'error') {
      toast.add({
        id: 'add_user_to_group_fail',
        title: 'Could not add user to group',
        description: `${selectedUserToAdd.value?.name} could not be added to the ${groupData.value?.group?.name} group`,
        color: 'red',
        icon: 'i-ph-warning-circle',
        timeout: 5000
      });
      return;
    }

    usersInGroup.value.push(orgMemberPublicId);
    // get the user profile from the org members list
    const member = orgMembersData?.value?.members?.find(
      (member) => member.publicId === orgMemberPublicId
    );
    tableRows.value.push({
      publicId: member?.profile.publicId || '',
      name: member?.profile.firstName + ' ' + member?.profile.lastName,
      handle: member?.profile.handle || '',
      title: member?.profile.title || '',
      role: '',
      notifications: ''
    });

    addingUserId.value = '';
    toast.add({
      id: 'user_added_to_group',
      title: 'User Added',
      description: `${selectedUserToAdd.value?.name} has been added to the ${groupData.value?.group?.name} group`,
      icon: 'i-ph-thumbs-up',
      timeout: 5000
    });
  }
</script>

<template>
  <div class="h-full w-full flex flex-col items-start gap-8 p-4">
    <div class="w-full flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-4">
        <UnUiTooltip text="Back to domains">
          <UnUiIcon
            name="i-ph-arrow-left"
            size="32"
            @click="navigateTo(`${orgSlug}/settings/org/users/groups`)" />
        </UnUiTooltip>
        <UnUiAvatar
          :color="groupData?.group?.color || 'base'"
          :name="groupData?.group?.name"
          :public-id="groupData?.group?.publicId || ''"
          :type="'group'"
          size="lg" />

        <div class="flex flex-col gap-1">
          <span
            v-if="!groupPending"
            class="text-2xl font-display">
            {{ groupData?.group?.name }}
          </span>
          <span
            v-if="!groupPending"
            class="text-xl">
            {{ groupData?.group?.description }}
          </span>
          <span
            v-if="groupPending"
            class="text-2xl font-mono">
            Loading...
          </span>
        </div>
      </div>
    </div>
    <div class="w-full flex flex-col gap-8 overflow-y-scroll">
      <div
        v-if="groupPending"
        class="w-full flex flex-col gap-8">
        <div class="flex flex-row items-center gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-2xl font-display">Loading...</span>
            <span class="text-sm">Please wait while we load your group</span>
          </div>
        </div>
      </div>
      <div
        v-if="!groupPending && !groupData?.group"
        class="w-full flex flex-col gap-8">
        <div class="flex flex-row items-center gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-2xl font-display">Group not found</span>
            <span class="text-sm"></span>
          </div>
        </div>
      </div>

      <div
        v-if="!groupPending && groupData?.group"
        class="w-full flex flex-col gap-8">
        <div class="flex flex-col gap-4">
          <div class="w-full border-b-1 border-base-5 pb-2">
            <span class="text-sm text-base-11 font-semibold uppercase">
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
                  :public-id="row.publicId"
                  :type="'user'"
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
            v-if="!showAddNewUser"
            label="Add more users to the group"
            @click="showAddUser()" />
          <div
            v-if="showAddNewUser && orgMembersPending"
            class="w-full flex flex-row items-center justify-center gap-4">
            <UnUiIcon
              name="i-svg-spinners:3-dots-fade"
              size="32" />
            <span>Loading group members</span>
          </div>
          <div
            v-if="showAddNewUser && !orgMembersPending"
            class="grid grid-cols-2 w-full gap-4">
            <NuxtUiSelectMenu
              v-model="selectedUserToAdd"
              searchable
              searchable-placeholder="Search a person..."
              placeholder="Select a person"
              :options="orgMembersDropdownData">
              <template
                v-if="selectedUserToAdd"
                #label>
                <UnUiIcon
                  name="i-ph-check"
                  class="h-4 w-4" />

                {{ selectedUserToAdd.label }}
                <UnUiTooltip
                  v-if="selectedUserToAdd.role === 'admin'"
                  text="Organization Admin">
                  <UnUiIcon
                    name="i-ph-crown"
                    class="text-yellow-8" />
                </UnUiTooltip>
              </template>
              <template #option="{ option }">
                <UnUiAvatar
                  :public-id="option.publicId"
                  :type="'user'"
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
              :disabled="!selectedUserToAdd"
              @click="
                addNewUserToGroup(selectedUserToAdd?.orgMemberPublicId || '')
              " />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
