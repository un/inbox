<script setup lang="ts">
  definePageMeta({
    layout: 'settings'
  });
  import { z } from 'zod';
  import { useClipboard, useTimeAgo } from '@vueuse/core';

  const { copy, copied, text } = useClipboard();
  const { $trpc, $i18n } = useNuxtApp();
  const route = useRoute();

  const orgPublicId = route.params.orgId as string;
  const emailIdentityPublicId = route.params.emailIdentityId as string;
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
      orgPublicId: orgPublicId,
      userGroupPublicId: emailIdentityPublicId,
      newUserGroup: isNewGroup
    },
    { server: false }
  );

  const {
    data: orgMembersData,
    pending: orgMembersPending,
    error: orgMembersError,
    execute: getOrgMembersList,
    refresh: orgMembersRefresh
  } = await $trpc.org.users.members.getOrgMembersList.useLazyQuery(
    {
      orgPublicId: orgPublicId
    },
    { server: false, immediate: false }
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
    avatarId: string;
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
      for (const member of newResults?.group?.members) {
        tableRows.value.push({
          publicId: member.publicId,
          avatarId: member.userProfile?.avatarId || '',
          name:
            member.userProfile?.firstName + ' ' + member.userProfile?.lastName,
          handle: member.userProfile?.handle || '',
          title: member.userProfile?.title || '',
          role: member.role,
          notifications: member.notifications
        });
        if (member.userProfile?.publicId) {
          usersInGroup.value.push(member.userProfile?.publicId);
        }
      }
    }
  });

  // TODO: If Existing SPF, Add checkbox to SPF record: "Select which senders to include" + create dynamic string- suggestion by @KumoMTA

  function showAddUser() {
    getOrgMembersList();
    showAddNewUser.value = true;
  }

  async function addNewUserToGroup(userProfilePublicId: string) {
    addingUserId.value = userProfilePublicId;
    const result = await $trpc.org.users.userGroups.addUserToGroup.mutate({
      orgPublicId: orgPublicId,
      groupPublicId: emailIdentityPublicId,
      userProfilePublicId: userProfilePublicId
    });
    if (!result.publicId) {
      console.log('Error adding user to group');
    } else {
      usersInGroup.value.push(userProfilePublicId);
      // get the user profile from the org members list
      const member = orgMembersData?.value?.members?.find(
        (member) => member.profile?.publicId === userProfilePublicId
      );
      tableRows.value.push({
        publicId: member?.profile.publicId || '',
        avatarId: member?.profile.avatarId || '',
        name: member?.profile.firstName + ' ' + member?.profile.lastName,
        handle: member?.profile.handle || '',
        title: member?.profile.title || '',
        role: '',
        notifications: ''
      });
    }
    addingUserId.value = '';
  }
</script>

<template>
  <div class="flex flex-col w-full h-full items-start p-4 gap-8">
    <div class="flex flex-row w-full justify-between items-center">
      <div class="flex flex-row gap-4 items-center">
        <UnUiTooltip text="Back to domains">
          <icon
            name="ph-arrow-left"
            size="32"
            @click="navigateTo(`/settings/org/${orgPublicId}/users/groups`)" />
        </UnUiTooltip>
        <UnUiAvatar
          :color="groupData?.group?.color || 'base'"
          :name="groupData?.group?.name"
          :avatar-id="groupData?.group?.avatarId || ''"
          size="lg" />

        <div class="flex flex-col gap-1">
          <span
            class="font-display text-2xl"
            v-if="!groupPending">
            {{ groupData?.group?.name }}
          </span>
          <span
            class="text-xl"
            v-if="!groupPending">
            {{ groupData?.group?.description }}
          </span>
          <span
            class="font-mono text-2xl"
            v-if="groupPending">
            Loading...
          </span>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-8 w-full overflow-y-scroll">
      <div
        class="flex flex-col gap-8 w-full"
        v-if="groupPending">
        <div class="flex flex-row gap-4 items-center">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Loading...</span>
            <span class="text-sm">Please wait while we load your group</span>
          </div>
        </div>
      </div>
      <div
        class="flex flex-col gap-8 w-full"
        v-if="!groupPending && !groupData?.group">
        <div class="flex flex-row gap-4 items-center">
          <div class="flex flex-col gap-1">
            <span class="font-display text-2xl">Group not found</span>
            <span class="text-sm"></span>
          </div>
        </div>
      </div>

      <div
        class="flex flex-col gap-8 w-full"
        v-if="!groupPending && groupData?.group">
        <div class="flex flex-col gap-4 items-center">
          <div class="w-full border-b-1 border-base-5 pb-2">
            <span class="text-sm uppercase text-base-11 font-semibold">
              Members
            </span>
          </div>
          {{ groupData }}
          <UnUiTable
            :columns="tableColumns"
            :rows="tableRows"
            class="text-md"
            :loading="groupPending">
            <template #name-data="{ row }">
              <div class="flex flex-row gap-2 items-center">
                <UnUiAvatar
                  :avatarId="row.avatarId"
                  :name="row.name"
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
                <Icon
                  :name="
                    row.notifications === 'active'
                      ? 'ph:bell-simple-ringing'
                      : row.notifications === 'muted'
                      ? 'ph:speaker-simple-slash'
                      : 'ph:bell-simple-slash'
                  " />
              </UnUiTooltip>
            </template>

            <template #receivingMode-data="{ row }">
              <div
                class="py-1 px-4 rounded-full w-fit"
                :class="
                  row.receivingMode === 'native'
                    ? 'bg-grass-5'
                    : row.receivingMode === 'forwarding'
                    ? 'bg-orange-5'
                    : 'bg-red-5'
                ">
                <span class="uppercase text-xs">{{ row.receivingMode }}</span>
              </div>
            </template>
          </UnUiTable>
          <UnUiButton
            label="Add more users to the group"
            size="sm"
            variant="outline"
            @click="showAddUser()"
            v-if="!showAddNewUser" />
          <div
            class="flex flex-row gap-4 w-full items-center justify-center"
            v-if="showAddNewUser && orgMembersPending">
            <Icon
              name="svg-spinners:3-dots-fade"
              size="32" />
            <span>Loading organization members</span>
          </div>
          <div
            class="grid grid-cols-2 gap-4 w-full"
            v-if="showAddNewUser && !orgMembersPending">
            <template v-for="member of orgMembersData?.members">
              <div
                class="flex flex-row justify-between bg-base-2 p-4 rounded-xl items-center"
                v-if="!usersInGroup.includes(member.profile?.publicId)">
                <div class="flex flex-row gap-4 items-center">
                  <UnUiAvatar
                    :avatar-id="member.profile?.avatarId || ''"
                    :name="
                      member.profile?.firstName + ' ' + member.profile?.lastName
                    "
                    size="sm" />
                  <div class="flex flex-col gap-0">
                    <div class="flex flex-row gap-2 items-center">
                      <span class="text-xl font-display">
                        {{
                          member.profile?.firstName +
                          ' ' +
                          member.profile?.lastName
                        }}
                      </span>
                      <UnUiTooltip
                        text="Organization Admin"
                        v-if="member.role === 'admin'">
                        <icon
                          name="ph:crown"
                          class="text-yellow-8" />
                      </UnUiTooltip>
                    </div>
                    <span class=""> @{{ member.profile?.handle }} </span>
                    <span class="">
                      {{ member.profile?.title }}
                    </span>
                  </div>
                </div>
                <UnUiButton
                  label="Add to group"
                  size="sm"
                  @click="addNewUserToGroup(member.profile?.publicId)"
                  :loading="addingUserId === member.profile?.publicId"
                  :disabled="usersInGroup.includes(member.profile?.publicId)" />
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
